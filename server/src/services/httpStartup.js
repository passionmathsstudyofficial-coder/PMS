import { createServer } from 'node:http';

// Bind promptly for Passenger, but never serve the application before initialization.
export function createReadinessServer({ timeoutMs = 15_000 } = {}) {
  let application, failed = false, resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});
  const unavailable = res => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '1' });
    res.end(JSON.stringify({ error: { message: 'Application is starting. Please retry shortly.' } }));
  };
  const server = createServer(async (req, res) => {
    if (application) return application(req, res);
    if (failed) return unavailable(res);
    let timer;
    try {
      const handler = await Promise.race([
        ready,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Startup timeout')), timeoutMs); timer.unref(); }),
      ]);
      if (!res.destroyed && !res.writableEnded) handler(req, res);
    } catch { unavailable(res); }
    finally { clearTimeout(timer); }
  });
  return {
    server,
    markReady(handler) { application = handler; resolveReady(handler); },
    markFailed(error) { failed = true; rejectReady(error); },
  };
}
