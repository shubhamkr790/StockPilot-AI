import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRouter from './routes/auth.ts';
import productsRouter from './routes/products.ts';
import salesRouter from './routes/sales.ts';
import invoicesRouter from './routes/invoices.ts';
import forecastRouter from './routes/forecast.ts';
import ledgerRouter from './routes/ledger.ts';
import aiRouter from './routes/ai.ts';
import { requireAuth } from './middleware/auth.ts';
import { ocrProviderName } from './ai/invoiceOcr.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'BAD_JSON', message: 'Request body is not valid JSON.' });
    next(err);
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', ocr: ocrProviderName() }));
  app.use('/api/auth', authRouter);

  // Everything below requires a signed session; the business is taken from the token only.
  app.use('/api/products', requireAuth, productsRouter);
  app.use('/api/sales', requireAuth, salesRouter);
  app.use('/api/invoices', requireAuth, invoicesRouter);
  app.use('/api/forecast', requireAuth, forecastRouter);
  app.use('/api/ledger', requireAuth, ledgerRouter);
  app.use('/api/ai', requireAuth, aiRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown API route.' }));

  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const PORT = Number(process.env.PORT) || 3001;
  createApp().listen(PORT, () => console.log(`StockPilot API on http://localhost:${PORT} (OCR: ${ocrProviderName() || 'not configured'})`));
}
