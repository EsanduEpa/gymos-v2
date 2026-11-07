// One operator-triggered request before a demonstration; no periodic keep-alive.
try {
  const url = new URL(process.env.GYMOS_API_URL ?? '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('configuration');
  }
  console.log('Waiting up to two minutes for the demo API to wake…');
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: 'error' });
  if (!response.ok || (await response.text()).trim() !== 'Hello World!') throw new Error('response');
  console.log('API is responding. Sign in through Vercel and verify scheduled-work health before the demo.');
} catch {
  console.error('Could not confirm the API response. Set GYMOS_API_URL to the public HTTPS API origin and check Render logs. No database readiness is implied.');
  process.exitCode = 1;
}
