// Pure validation: no dotenv, secrets in logs, network calls or database mutations.
export function deploymentConfiguration(env, { database = true, web = false } = {}) {
  if (web || database) {
    const origin = new URL(env.GYMOS_WEB_ORIGIN ?? '');
    if (origin.protocol !== 'https:' || origin.origin !== env.GYMOS_WEB_ORIGIN) throw Error('Set GYMOS_WEB_ORIGIN to the exact public HTTPS web origin');
  }
  if (web) {
    const api = new URL(env.GYMOS_API_URL ?? '');
    if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) throw Error('Set GYMOS_API_URL to the public HTTPS API address');
  }
  if (!database) return;
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || /replace-with|example|changeme/i.test(env.JWT_SECRET)) throw Error('Configure a new random JWT_SECRET of at least 32 characters');
  const expectedHost = env.GYMOS_DEPLOY_DATABASE_HOST;
  const supabase = /^db\.[a-z0-9]+\.supabase\.co$/.test(expectedHost ?? '');
  const neon = /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(expectedHost ?? '') && !expectedHost.includes('-pooler.');
  if (!supabase && !neon) throw Error('Set GYMOS_DEPLOY_DATABASE_HOST to the direct Supabase or Neon database host');
  const urls = {};
  for (const key of ['MASTER_DATABASE_URL', 'TENANT_DATABASE_URL', 'PROVISION_DATABASE_URL']) {
    let url;
    try { url = new URL(env[key] ?? ''); } catch { throw Error(`Set ${key} to a valid PostgreSQL connection`); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== expectedHost || (url.port && url.port !== '5432')
      || !url.username || !url.password || url.hash || url.searchParams.get('sslmode') !== 'verify-full'
      || [...url.searchParams.keys()].some(key => key !== 'sslmode')) throw Error(`${key} must use the approved direct host on port 5432 with sslmode=verify-full`);
    urls[key] = url;
  }
  const name = decodeURIComponent(urls.MASTER_DATABASE_URL.pathname.slice(1));
  if (!/^gymos_[a-z0-9_]{1,50}$/.test(name)) throw Error('Use a dedicated gymos_ Master database, never a provider default database');
  return urls;
}
