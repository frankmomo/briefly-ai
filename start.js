// ============================================================
// start.js - Shared entrypoint for API and worker on Railway
// Usage: node start.js
// ============================================================
import { config } from 'dotenv';
import http from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

if (!process.env.SUPABASE_URL) {
  console.error('[start.js] ERROR: SUPABASE_URL is not configured.');
  process.exit(1);
}

const serviceName = process.env.RAILWAY_SERVICE_NAME || '';
const processRole = (
  process.env.BRIEFLY_PROCESS_ROLE ||
  (serviceName.toLowerCase().includes('worker') ? 'worker' : 'api')
).toLowerCase();

if (processRole === 'worker') {
  console.log('[start.js] Starting Briefly worker.');
  const port = process.env.PORT || 3001;
  http
    .createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, service: 'briefly-worker' }));
        return;
      }

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    })
    .listen(port, () => {
      console.log(`[start.js] Worker healthcheck listening on port ${port}.`);
    });

  await import('./src/worker/summarizer-worker.js');
} else {
  console.log('[start.js] Starting Briefly API.');
  await import('./src/api/server.js');
}
