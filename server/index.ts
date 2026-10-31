import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.ts';
import productsRouter from './routes/products.ts';
import salesRouter from './routes/sales.ts';
import invoicesRouter from './routes/invoices.ts';
import forecastRouter from './routes/forecast.ts';
import ledgerRouter from './routes/ledger.ts';
import testLabRouter from './routes/testLab.ts';
import { tenantAuthMiddleware } from './middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'StockPilot AI',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Unauthenticated / Auth Routes
app.use('/api/auth', authRouter);
app.use('/api/test', testLabRouter);

// Tenant-Scoped & RBAC Protected Business Routes
app.use('/api/products', tenantAuthMiddleware, productsRouter);
app.use('/api/sales', tenantAuthMiddleware, salesRouter);
app.use('/api/invoices', tenantAuthMiddleware, invoicesRouter);
app.use('/api/forecast', tenantAuthMiddleware, forecastRouter);
app.use('/api/ledger', tenantAuthMiddleware, ledgerRouter);

// Serve static frontend build if present in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for client routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <html>
          <body style="font-family: sans-serif; background: #0F392B; color: white; padding: 40px;">
            <h2>StockPilot AI Backend API Active</h2>
            <p>Port: ${PORT}</p>
            <p>Open <a href="http://localhost:3000" style="color: #34D399;">http://localhost:3000</a> for the Vite Frontend</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  STOCKPILOT AI — SMART INVENTORY REPLENISHMENT SERVER `);
  console.log(`  Running on http://localhost:${PORT}                  `);
  console.log(`  Frontend dev proxy configured to :3000               `);
  console.log(`=======================================================`);
});
