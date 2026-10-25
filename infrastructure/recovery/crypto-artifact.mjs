import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, link, lstat, mkdir, mkdtemp, open, readFile, realpath, rm, statfs, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const MAGIC = Buffer.from('GYMOSB01');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const within = (parent, child) => { const rel = relative(resolve(parent), resolve(child)); return !rel.startsWith('..') && !isAbsolute(rel); };
export function canonicalJson(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  throw new Error('Unsupported authenticated metadata');
}
function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error('Invalid metadata shape');
}
async function assertSafeExternalPath(path) {
  const absolute = resolve(path);
  const canonical = await realpath(absolute).catch(async (error) => {
    if (error.code !== 'ENOENT') throw new Error('Recovery path could not be validated');
    const parent = await realpath(dirname(absolute));
    return join(parent, basename(absolute));
  });
  if (canonical !== absolute) throw new Error('Recovery path must use its canonical local path');
  for (let current = canonical; ; current = dirname(current)) {
    try { await lstat(join(current, '.git')); throw new Error('Recovery files must be outside a Git repository'); }
    catch (error) { if (error.message === 'Recovery files must be outside a Git repository') throw error; }
    if (current === dirname(current)) break;
  }
}
export function validateMetadata(value) {
  exactKeys(value, ['scope','sourceRunId','kind','gymId','manifestDigest','snapshotAt','observedOperationsAt','toolVersion','format','counts','dataDigest']);
  if (value.scope !== 'DISPOSABLE_DEVELOPMENT' || !/^[a-f0-9]{16}$/.test(value.sourceRunId)
    || !['MASTER','TENANT'].includes(value.kind) || value.format !== 'postgres-custom'
    || !SHA.test(value.manifestDigest) || !SHA.test(value.dataDigest)
    || !/^PostgreSQL 17\.[0-9]+$/.test(value.toolVersion)
    || (value.kind === 'TENANT' ? !/^[A-Za-z0-9_-]{1,128}$/.test(value.gymId) : value.gymId !== null)) throw new Error('Invalid authenticated metadata');
  for (const k of ['snapshotAt','observedOperationsAt']) {
    if (typeof value[k] !== 'string' || new Date(value[k]).toISOString() !== value[k]) throw new Error('Invalid snapshot instant');
  }
  if (!value.counts || Object.getPrototypeOf(value.counts) !== Object.prototype || Object.keys(value.counts).length > 64) throw new Error('Invalid counts');
  for (const [name,count] of Object.entries(value.counts)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) || !Number.isSafeInteger(count) || count < 0) throw new Error('Invalid counts');
  }
  return value;
}
async function privateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077)) throw new Error('A private directory is required');
}
async function privateFile(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077)) throw new Error('A private regular file is required');
  return info;
}
async function loadKey(keyFile, artifactDirectory) {
  await assertSafeExternalPath(keyFile);
  if (within(artifactDirectory, keyFile)) throw new Error('Encryption key must be separate from backup storage');
  try {
    const parent = await lstat(dirname(resolve(keyFile)));
    if (!parent.isDirectory() || parent.isSymbolicLink() || (parent.mode & 0o077)) throw new Error('A private key directory is required');
    await privateFile(keyFile);
    const key = await readFile(keyFile);
    if (key.length !== 32) { key.fill(0); throw new Error('invalid key length'); }
    return key;
  } catch { throw new Error('A protected separate 32-byte backup key is unavailable or invalid'); }
}
async function fileHash(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
async function readHeader(path) {
  const file = await open(path, 'r');
  try {
    const start = Buffer.alloc(12);
    if ((await file.read(start,0,12,0)).bytesRead !== 12 || !start.subarray(0,8).equals(MAGIC)) throw new Error('Invalid backup envelope');
    const length = start.readUInt32BE(8);
    if (length < 2 || length > 64 * 1024) throw new Error('Invalid backup header length');
    const tail = Buffer.alloc(length + 12);
    if ((await file.read(tail,0,tail.length,12)).bytesRead !== tail.length) throw new Error('Truncated backup header');
    const json = tail.subarray(0,length).toString('utf8');
    const metadata = validateMetadata(JSON.parse(json));
    if (canonicalJson(metadata) !== json) throw new Error('Metadata is not canonical');
    const size = (await file.stat()).size;
    const header = Buffer.concat([start,tail]);
    if (size < header.length + 16) throw new Error('Truncated backup ciphertext');
    const tag = Buffer.alloc(16);
    await file.read(tag,0,16,size-16);
    return { metadata, header, nonce:tail.subarray(length), tag, size };
  } finally { await file.close(); }
}
async function authenticatedPlaintext(path, key, tempRoot, expectedMetadata, callback) {
  await privateDirectory(tempRoot);
  if (within(dirname(path), tempRoot)) throw new Error('Plaintext temporary storage must be outside backup storage');
  const info = await privateFile(path);
  const { metadata,header,nonce,tag,size } = await readHeader(path);
  if (canonicalJson(metadata) !== canonicalJson(expectedMetadata)) throw new Error('Backup metadata mismatch');
  const free = await statfs(tempRoot, { bigint:true });
  if (free.bavail * free.bsize < BigInt(info.size) + 1024n * 1024n) throw new Error('Insufficient private restore space');
  const work = await mkdtemp(join(tempRoot,'gymos-restore-'));
  await chmod(work,0o700);
  const plaintext = join(work,'archive.dump');
  try {
    const decipher = createDecipheriv('aes-256-gcm',key,nonce);
    decipher.setAAD(header); decipher.setAuthTag(tag);
    await pipeline(createReadStream(path,{start:header.length,end:size-17}),decipher,createWriteStream(plaintext,{flags:'wx',mode:0o600}));
    // GCM authentication has finished before the callback can run pg_restore.
    return await callback(plaintext,metadata);
  } finally { await rm(work,{recursive:true,force:true}); }
}
export async function createEncryptedBackup({ directory,tempRoot,keyFile,metadata,verifySource,producer }) {
  directory=resolve(directory); tempRoot=resolve(tempRoot);
  await Promise.all([assertSafeExternalPath(directory), assertSafeExternalPath(tempRoot), assertSafeExternalPath(keyFile)]);
  const key=await loadKey(keyFile,directory); // Missing key precedes any database work.
  try {
  validateMetadata(metadata);
  await privateDirectory(directory);
  await privateDirectory(tempRoot);
  if (within(directory,tempRoot)) throw new Error('Plaintext temporary storage must be outside backup storage');
  await verifySource(metadata); // Actual 005 schema/binding/snapshot verifier seam.
  const artifactId=randomUUID();
  const final=join(directory,`${artifactId}.gbackup`);
  const temporary=join(directory,`${artifactId}.partial`);
  const manifestPath=join(directory,`${artifactId}.json`);
  const manifestTemporary=join(directory,`${artifactId}.json.partial`);
  const bytes=Buffer.from(canonicalJson(metadata));
  const length=Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  const nonce=randomBytes(12);
  const header=Buffer.concat([MAGIC,length,bytes,nonce]);
  const cipher=createCipheriv('aes-256-gcm',key,nonce); cipher.setAAD(header);
  let published=false;
  try {
    const source=await producer();
    async function* encrypted() {
      yield header;
      for await (const chunk of source.readable) yield cipher.update(chunk);
      yield cipher.final(); yield cipher.getAuthTag();
    }
    const encryption = pipeline(Readable.from(encrypted()),createWriteStream(temporary,{flags:'wx',mode:0o600}));
    try { await Promise.all([encryption,source.completion]); }
    catch {
      source.readable.destroy();
      if (source.cancel) await source.cancel();
      await Promise.allSettled([encryption,source.completion]);
      throw new Error('Archive producer failed');
    }
    await authenticatedPlaintext(temporary,key,tempRoot,metadata,async (path) => {
      await pipeline(createReadStream(path),new Writable({write(_chunk,_encoding,done){done();}}));
    });
    const manifest={formatVersion:1,artifactId,metadata,keyId:createHash('sha256').update(key).digest('hex').slice(0,16),
      encryptedSha256:await fileHash(temporary),encryptedBytes:(await lstat(temporary)).size,
      integrityVerifiedAt:new Date().toISOString()};
    const descriptor=await open(manifestTemporary,'wx',0o600);
    try { await descriptor.writeFile(canonicalJson(manifest)+'\n'); } finally { await descriptor.close(); }
    // Exclusive publication: link refuses overwrite and both files remain private.
    await link(temporary,final); published=true;
    await link(manifestTemporary,manifestPath);
    return {artifactId,manifestPath,manifest};
  } catch { if(published) await unlink(final).catch(()=>{}); throw new Error('Backup creation failed; no complete artifact published'); }
  finally { await Promise.all([rm(temporary,{force:true}),rm(manifestTemporary,{force:true})]); }
  } catch { throw new Error('Backup creation failed; no complete artifact published'); }
  finally { key.fill(0); }
}
export async function withVerifiedArchive({manifestPath,keyFile,tempRoot,expected},callback) {
  const directory=dirname(resolve(manifestPath));
  await Promise.all([assertSafeExternalPath(directory), assertSafeExternalPath(tempRoot), assertSafeExternalPath(keyFile)]);
  const key=await loadKey(keyFile,directory);
  let callbackEntered=false;
  try {
    exactKeys(expected,['sourceRunId','kind','gymId','manifestDigest']);
    const info=await privateFile(manifestPath);
    if(info.size>128*1024)throw new Error('Oversized backup manifest');
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    exactKeys(manifest,['formatVersion','artifactId','metadata','keyId','encryptedSha256','encryptedBytes','integrityVerifiedAt']);
    if(manifest.formatVersion!==1||!UUID.test(manifest.artifactId)||basename(manifestPath)!==`${manifest.artifactId}.json`
      ||!SHA.test(manifest.encryptedSha256)||!Number.isSafeInteger(manifest.encryptedBytes)||manifest.encryptedBytes<1)throw new Error('Invalid backup manifest');
    const metadata=validateMetadata(manifest.metadata);
    for(const [key,value]of Object.entries(expected)) {
      if(!['sourceRunId','kind','gymId','manifestDigest'].includes(key)||metadata[key]!==value)throw new Error('Unexpected backup scope');
    }
    const artifact=join(directory,`${manifest.artifactId}.gbackup`);
    const artifactInfo=await privateFile(artifact);
    if(artifactInfo.size!==manifest.encryptedBytes||await fileHash(artifact)!==manifest.encryptedSha256)throw new Error('Encrypted checksum mismatch');
    if(createHash('sha256').update(key).digest('hex').slice(0,16)!==manifest.keyId)throw new Error('Backup key mismatch');
    return await authenticatedPlaintext(artifact,key,tempRoot,metadata,async(path,authenticatedMetadata)=>{
      callbackEntered=true;
    return await callback(path,authenticatedMetadata,manifest);
    });
  } catch(error) {
    if(callbackEntered)throw error; // Never misreport an unknown/committed restore as pre-mutation failure.
    throw new Error('Backup verification failed before restore');
  }
  finally {key.fill(0);}
}
