// ============================================================
// start.js — Carga .env y arranca el servidor
// Uso: node start.js
// ============================================================
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

// Verificar que cargó
if (!process.env.SUPABASE_URL) {
  console.error('[start.js] ERROR: .env no cargó correctamente.');
  console.error('[start.js] Buscando en:', resolve(__dirname, '.env'));
  process.exit(1);
}

console.log(`[start.js] ✅ .env cargado: SUPABASE_URL=${process.env.SUPABASE_URL.substring(0, 20)}...`);
await import('./src/api/server.js');
