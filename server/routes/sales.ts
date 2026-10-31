import { Router } from 'express';
import { ledgerEngine } from '../db/ledger.ts';
import { handle } from './util.ts';

const router = Router();

// Single item or multi-item bill. Same Idempotency-Key => same receipt, stock changes once.
router.post(
  '/',
  handle((req, res) => {
    const key = (req.headers['idempotency-key'] as string | undefined) || req.body?.idempotencyKey;
    const { sale, replayed } = ledgerEngine.recordSale(req.tenantId, req.userId, req.body?.items, key);
    res.status(replayed ? 200 : 201).json({ sale, replayed });
  })
);

router.get('/', handle((req, res) => res.json({ sales: ledgerEngine.getSalesHistory(req.tenantId, Number(req.query.limit) || 50) })));

router.post(
  '/:id/return',
  handle((req, res) => {
    const { productId, quantity, reason } = req.body || {};
    res.json({ product: ledgerEngine.recordReturn(req.tenantId, req.userId, req.params.id, productId, quantity, reason) });
  })
);

export default router;
