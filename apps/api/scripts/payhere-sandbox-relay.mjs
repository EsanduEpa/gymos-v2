import { createServer } from 'node:http';

const maxBodyBytes = 16_384;
const callback = /^\/gyms\/test-(?:alpha|beta|gamma)\/payments\/payhere\/(?:membership-notify|pt-pack-notify|subscription-notify)$/;
const relay = createServer({ requestTimeout: 10_000, headersTimeout: 5_000 }, async (request, response) => {
  response.setHeader('cache-control', 'no-store');
  const path = request.url ?? '';
  if (!callback.test(path)) {
    response.writeHead(404).end();
    return;
  }
  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'POST' }).end();
    return;
  }
  const contentType = request.headers['content-type'];
  if (contentType?.split(';')[0]?.trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
    response.writeHead(415).end();
    return;
  }
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      bytes += chunk.length;
      if (bytes > maxBodyBytes) {
        response.writeHead(413, { connection: 'close' }).end();
        return;
      }
      chunks.push(chunk);
    }
    const result = await fetch(new URL(path, 'http://127.0.0.1:3003'), {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: Buffer.concat(chunks, bytes),
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    await result.body?.cancel();
    response.writeHead(result.status).end();
  } catch {
    response.writeHead(502).end();
  }
});
relay.listen(3004, '127.0.0.1', () => {
  console.log('PayHere Sandbox relay listening on http://127.0.0.1:3004 for synthetic gym callbacks.');
});
