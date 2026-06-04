# Briefly AI

Micro-SaaS de briefings ejecutivos generados desde Gmail, Drive y Calendar.

## Arquitectura de despliegue

- `web/`: frontend Next.js, desplegado en Vercel.
- `src/api/`: API Express, desplegada como servicio publico en Railway.
- `src/worker/`: worker BullMQ, desplegado como segundo servicio privado en Railway.
- `src/cron/`: tarea programada para encolar briefings.
- Supabase: base de datos.
- Upstash o Redis: cola BullMQ.

Vercel no aloja la API Express. El frontend usa `NEXT_PUBLIC_API_URL` para
llamar directamente al dominio publico de Railway.

## Desarrollo local

```bash
npm ci
cd web && npm ci && cd ..

# Terminal 1: API
npm run dev

# Terminal 2: frontend
cd web && npm run dev

# Terminal 3: worker
npm run worker
```

Crea `.env` desde `.env.example` y `web/.env.local` desde `web/.env.example`.

## Variables

### Railway API y worker

Configura las variables de `.env.example` en ambos servicios. Las claves
criticas son Supabase, Redis, OpenAI, Google OAuth, Stripe y `JWT_SECRET`.
No despliegues valores de ejemplo como `localhost`, `tu_*`, `sk_*_tu_*` o
URLs de proyecto ficticias: la API puede responder al healthcheck aunque las
integraciones todavia no sean utilizables.

- `APP_URL`: URL publica de Vercel, por ejemplo `https://briefly-ai-one.vercel.app`.
- `GOOGLE_REDIRECT_URI`: callback del frontend, por ejemplo
  `https://briefly-ai-one.vercel.app/callback`.

### Vercel frontend

- `NEXT_PUBLIC_API_URL`: dominio publico de la API en Railway, sin `/api`.

## Railway

1. Conecta este repositorio a un proyecto Railway.
2. Crea un servicio `briefly-api` usando `/railway.json`.
3. Genera un dominio publico para `briefly-api`.
4. Crea un servicio `briefly-worker` usando `/railway.worker.json`.
5. Crea una tarea programada con el comando `npm run digest:cron`.

El servicio API usa `Dockerfile`; el worker usa `Dockerfile.worker`.

Configura en proveedores externos:

- Google OAuth redirect URI: `https://briefly-ai-one.vercel.app/callback`.
- Stripe webhook: `https://briefly-ai-production.up.railway.app/api/webhooks/stripe`.

## Vercel

El proyecto Vercel debe apuntar a `web/` como raiz o desplegarse desde esa
carpeta. Configura `NEXT_PUBLIC_API_URL` antes del build.

## GitHub Actions

El workflow `.github/workflows/ci.yml`:

1. Instala dependencias con `npm ci`.
2. Valida sintaxis del backend.
3. Compila el frontend.
4. Despliega el frontend al proyecto Vercel canonico en pushes a `main`.

Requiere el secreto `VERCEL_TOKEN` en GitHub. Railway puede desplegar por su
integracion nativa con GitHub, evitando tokens y seleccion ambigua de servicios
en el workflow.
