// ============================================================
// briefly-ai/src/api/server.js — Entrypoint Express
// ============================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.js';
import { billingRouter } from './routes/billing.js';
import { digestRouter } from './routes/digest.js';
import { webhookRouter } from './routes/webhooks.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
// IMPORTANTE: helmet + cors ANTES de cualquier body parser
app.use(helmet());
app.use(cors({ origin: process.env.APP_URL }));

// ─── Routes ──────────────────────────────────────────────────
// Webhooks deben ir ANTES de express.json() porque Stripe requiere body raw
app.use('/api/webhooks', webhookRouter);

// Para todo lo demás, JSON parser
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/digest', digestRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Briefly] Server running on port ${PORT}`);
});

export default app;
