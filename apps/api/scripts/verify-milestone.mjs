import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient as MasterClient } from '../dist/generated/master/client.js';
import { PrismaClient as TenantClient } from '../dist/generated/tenant/client.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const apiDir = join(root, 'apps/api');
const webDir = join(root, 'apps/web');
const required = ['MASTER_DATABASE_URL', 'TENANT_DATABASE_URL', 'PROVISION_DATABASE_URL', 'JWT_SECRET'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is missing. Run with node --env-file=.env.`);
}

const master = new MasterClient({
  adapter: new PrismaPg({ connectionString: process.env.MASTER_DATABASE_URL }),
});
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const adminEmail = `admin-e2e-${suffix}@example.test`;
const adminPassword = randomBytes(24).toString('base64url');
const fixtures = [
  { slug: `gym-e2e-a-${suffix}`, name: 'E2E Gym A', email: `owner-a-${suffix}@example.test`, password: randomBytes(24).toString('base64url'), color: '#0F766E', member: 'E2E Member A' },
  { slug: `gym-e2e-b-${suffix}`, name: 'E2E Gym B', email: `owner-b-${suffix}@example.test`, password: randomBytes(24).toString('base64url'), color: '#7C3AED', member: 'E2E Member B' },
];

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function start(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr.on('data', (chunk) => { errors = (errors + chunk.toString()).slice(-4000); });
  child.on('error', (error) => { errors = (errors + error.message).slice(-4000); });
  return { child, errors: () => errors };
}

async function waitReady(url, processInfo) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (processInfo.child.exitCode !== null) {
      throw new Error(`Server exited before ready: ${processInfo.errors()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not start: ${processInfo.errors()}`);
}

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#x3D;', '=').replaceAll('&#x2F;', '/');
}

function findForm(html, fieldName) {
  const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map((match) => match[0]);
  const form = forms.find((item) => item.includes(`name="${fieldName}"`));
  if (!form) throw new Error(`Web form with ${fieldName} was not rendered`);
  return form;
}

function formBody(form, values) {
  const body = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const tag = match[0];
    if (!/type="hidden"/.test(tag)) continue;
    const name = tag.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const value = tag.match(/value="([^"]*)"/)?.[1] ?? '';
    body.append(decodeHtml(name), decodeHtml(value));
  }
  for (const [key, value] of Object.entries(values)) body.append(key, value);
  return body;
}

async function submitWebForm(webBase, path, cookie, fieldName, values) {
  const page = await fetch(webBase + path, { headers: cookie ? { cookie } : {} });
  const form = findForm(await page.text(), fieldName);
  return fetch(webBase + path, {
    method: 'POST',
    headers: cookie ? { cookie } : {},
    body: formBody(form, values),
    redirect: 'manual',
  });
}

async function webLogin(webBase, email, password, expectedPath) {
  const response = await submitWebForm(webBase, '/login', '', 'password', { email, password });
  assert.equal(response.status, 303, await response.text());
  assert.equal(response.headers.get('location'), expectedPath);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie?.startsWith('gymos_access_token='));
  return cookie;
}

async function apiRequest(apiBase, path, token, method = 'GET', body) {
  const response = await fetch(apiBase + path, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

async function stop(processInfo) {
  if (!processInfo || processInfo.child.exitCode !== null) return;
  processInfo.child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => processInfo.child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (processInfo.child.exitCode === null) processInfo.child.kill('SIGKILL');
}

async function cleanup() {
  const databaseNames = [];
  for (const fixture of fixtures) {
    const gym = await master.gym.findUnique({ where: { slug: fixture.slug } });
    if (gym) {
      databaseNames.push(gym.databaseName);
      await master.gym.delete({ where: { id: gym.id } });
    }
  }
  await master.user.deleteMany({
    where: { email: { in: [adminEmail, ...fixtures.map((fixture) => fixture.email)] } },
  });
  if (databaseNames.length) {
    const admin = new pg.Client({ connectionString: process.env.PROVISION_DATABASE_URL });
    await admin.connect();
    try {
      for (const name of databaseNames) {
        assert.match(name, /^gymos_[a-f0-9]{32}$/);
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      }
    } finally {
      await admin.end();
    }
  }
}

let apiProcess;
let webProcess;
let failed = false;
try {
  const apiPort = await freePort();
  const webPort = await freePort();
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const webBase = `http://127.0.0.1:${webPort}`;
  apiProcess = start(process.execPath, [join(apiDir, 'dist/main.js')], apiDir, { ...process.env, PORT: String(apiPort) });
  await waitReady(apiBase + '/', apiProcess);
  webProcess = start(process.execPath, [join(webDir, 'node_modules/next/dist/bin/next'), 'start', '-p', String(webPort), '-H', '127.0.0.1'], webDir, { ...process.env, GYMOS_API_URL: apiBase });
  await waitReady(webBase + '/', webProcess);

  await master.user.create({
    data: { email: adminEmail, passwordHash: await argon2.hash(adminPassword), globalRole: 'SUPER_ADMIN' },
  });
  const adminCookie = await webLogin(webBase, adminEmail, adminPassword, '/admin');
  const adminToken = adminCookie.split('=')[1];
  const adminPage = await fetch(webBase + '/admin', { headers: { cookie: adminCookie } });
  assert.ok((await adminPage.text()).includes('Create a gym'));

  for (const fixture of fixtures) {
    const response = await submitWebForm(webBase, '/admin', adminCookie, 'ownerPassword', {
      name: fixture.name,
      slug: fixture.slug,
      ownerEmail: fixture.email,
      ownerPassword: fixture.password,
    });
    assert.equal(response.status, 303, await response.text());
    assert.equal(response.headers.get('location'), `/admin?created=${fixture.slug}`);
    const gym = await master.gym.findUnique({ where: { slug: fixture.slug } });
    assert.equal(gym?.status, 'ACTIVE');
    const theme = await apiRequest(apiBase, `/gyms/${fixture.slug}/theme`);
    assert.equal(theme.body.theme.primaryColor, '#2563EB');
    const ownerCookie = await webLogin(webBase, fixture.email, fixture.password, `/gyms/${fixture.slug}`);
    const ownerToken = ownerCookie.split('=')[1];
    const themeUpdate = await apiRequest(apiBase, `/gyms/${fixture.slug}/theme`, ownerToken, 'PATCH', { primaryColor: fixture.color });
    assert.equal(themeUpdate.status, 200);
    const memberPage = await fetch(webBase + `/gyms/${fixture.slug}`, { headers: { cookie: ownerCookie } });
    assert.ok((await memberPage.text()).includes(fixture.color));
    const created = await submitWebForm(webBase, `/gyms/${fixture.slug}`, ownerCookie, 'fullName', {
      fullName: fixture.member,
      email: `member-${fixture.slug}@example.test`,
    });
    assert.equal(created.status, 303, await created.text());
    const members = await apiRequest(apiBase, `/gyms/${fixture.slug}/members`, ownerToken);
    assert.equal(members.status, 200);
    assert.ok(members.body.some((member) => member.fullName === fixture.member));
    const updatedPage = await fetch(webBase + `/gyms/${fixture.slug}`, { headers: { cookie: ownerCookie } });
    assert.ok((await updatedPage.text()).includes(fixture.member));
    fixture.ownerToken = ownerToken;
    fixture.ownerCookie = ownerCookie;
    fixture.gym = gym;
  }

  const [a, b] = fixtures;
  assert.equal((await apiRequest(apiBase, `/gyms/${b.slug}/members`, a.ownerToken)).status, 403);
  assert.equal((await apiRequest(apiBase, `/gyms/${a.slug}/members`, b.ownerToken)).status, 403);
  assert.equal((await apiRequest(apiBase, `/admin/gyms`, a.ownerToken)).status, 403);
  assert.equal((await apiRequest(apiBase, `/admin/gyms`, adminToken)).status, 200);
  const crossPage = await fetch(webBase + `/gyms/${b.slug}`, { headers: { cookie: a.ownerCookie } });
  assert.ok(!(await crossPage.text()).includes(b.member));
  for (const fixture of fixtures) {
    const url = new URL(process.env.TENANT_DATABASE_URL);
    url.pathname = '/' + fixture.gym.databaseName;
    const tenant = new TenantClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
    try {
      const members = await tenant.member.findMany();
      assert.equal(members.length, 1);
      assert.equal(members[0].fullName, fixture.member);
    } finally {
      await tenant.$disconnect();
    }
  }
  console.log('PASS: two gyms created from web, owner login, distinct themes and members, API access isolation, physical database isolation');
} catch (error) {
  failed = true;
  console.error(error);
} finally {
  await stop(webProcess);
  await stop(apiProcess);
  try {
    await cleanup();
    console.log('Temporary gyms, owners, members, and databases removed.');
  } catch (error) {
    failed = true;
    console.error('Cleanup failed:', error);
  }
  await master.$disconnect();
}
if (failed) process.exitCode = 1;
