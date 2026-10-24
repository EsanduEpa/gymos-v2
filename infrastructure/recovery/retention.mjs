// Input manifests must have just passed authenticated artifact verification.
// A plain manifest "verified" flag is never an attestation of restorability.
export function planRetention(authenticated, {minimumDays=7,lastKnownGoodId}) {
  if(!Number.isSafeInteger(minimumDays)||minimumDays<7)throw new Error('Retain at least seven daily generations');
  if(!lastKnownGoodId||!authenticated.some((x)=>x.artifactId===lastKnownGoodId))throw new Error('A verified last-known-good artifact is required');
  const ordered=[...authenticated].sort((a,b)=>b.snapshotAt.localeCompare(a.snapshotAt)||a.artifactId.localeCompare(b.artifactId));
  const days=new Set(),keep=new Set([lastKnownGoodId]);
  for(const artifact of ordered){
    const day=artifact.snapshotAt.slice(0,10);
    if(days.size<minimumDays&&!days.has(day)){days.add(day);keep.add(artifact.artifactId);}
  }
  // If fewer than seven actual daily generations exist, retain everything.
  if(days.size<minimumDays)return {keep:ordered.map((x)=>x.artifactId),remove:[],dailyGenerations:days.size,meetsDailyMinimum:false};
  return {keep:[...keep],remove:ordered.filter((x)=>!keep.has(x.artifactId)).map((x)=>x.artifactId),dailyGenerations:days.size,meetsDailyMinimum:true};
}
import { unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { withVerifiedArchive } from './crypto-artifact.mjs';


// Verify every candidate before planning, then verify each removal again immediately
// before deleting its paired manifest and ciphertext. Any verification error aborts
// pruning without deleting another generation.
export async function pruneVerifiedGenerations({ manifests, keyFile, tempRoot, expectedFor, lastKnownGoodId, minimumDays = 7 }) {
  if (!Array.isArray(manifests) || manifests.length === 0) throw new Error('Verified backup manifests are required');
  const verified = [];
  const byId = new Map();
  for (const manifestPath of manifests) {
    const expected = await expectedFor(manifestPath);
    const item = await withVerifiedArchive({ manifestPath, keyFile, tempRoot, expected }, async (_archive, metadata, manifest) => ({
      artifactId: manifest.artifactId,
      snapshotAt: metadata.snapshotAt,
      manifestPath,
      metadata,
      expected,
    }));
    if (byId.has(item.artifactId)) throw new Error('Duplicate backup generation');
    byId.set(item.artifactId, item);
    verified.push(item);
  }
  const plan = planRetention(verified, { minimumDays, lastKnownGoodId });
  for (const artifactId of plan.remove) {
    const item = byId.get(artifactId);
    if (!item) throw new Error('Retention plan referenced an unknown artifact');
    await withVerifiedArchive({ manifestPath: item.manifestPath, keyFile, tempRoot, expected: item.expected }, async () => {
      const directory = dirname(item.manifestPath);
      await unlink(join(directory, `${artifactId}.gbackup`));
      await unlink(item.manifestPath);
    });
  }
  return { ...plan, deleted: [...plan.remove] };
}
