import { Router } from 'express';
import { requireRole } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';
import { handle } from './util.ts';

const router = Router();
const ownerOnly = requireRole(['OWNER']);

router.get(
  '/',
  handle((req, res) => {
    const products = ledgerEngine.listProducts(req.tenantId, {
      category: req.query.category as string | undefined,
      query: req.query.q as string | undefined,
      status: req.query.status as string | undefined,
      includeArchived: req.query.archived === 'true',
    });
    res.json({ count: products.length, products });
  })
);

router.get('/:id', handle((req, res) => res.json({ product: ledgerEngine.getProductSummary(req.tenantId, req.params.id) })));

router.get(
  '/:id/movements',
  handle((req, res) => {
    ledgerEngine.getOwnedProduct(req.tenantId, req.params.id);
    res.json({ movements: ledgerEngine.getMovementHistory(req.tenantId, 200, req.params.id) });
  })
);

router.post(
  '/',
  ownerOnly,
  handle((req, res) => {
    const { openingStock, ...data } = req.body || {};
    res.status(201).json({ product: ledgerEngine.addProduct(req.tenantId, req.userId, data, openingStock === undefined ? 0 : openingStock) });
  })
);

router.put('/:id', ownerOnly, handle((req, res) => res.json({ product: ledgerEngine.updateProduct(req.tenantId, req.userId, req.params.id, req.body || {}) })));

router.delete(
  '/:id',
  ownerOnly,
  handle((req, res) => {
    const result = ledgerEngine.archiveProduct(req.tenantId, req.userId, req.params.id);
    res.json({
      result,
      message: result === 'ARCHIVED' ? 'Product archived. Its sales and stock history are kept.' : 'Product deleted (it had no history).',
    });
  })
);

router.post('/:id/restore', ownerOnly, handle((req, res) => res.json({ product: ledgerEngine.restoreProduct(req.tenantId, req.userId, req.params.id) })));

router.post(
  '/:id/adjust',
  ownerOnly,
  handle((req, res) => {
    const { deltaQuantity, reason, note } = req.body || {};
    res.json({ product: ledgerEngine.manualStockAdjustment(req.tenantId, req.userId, req.params.id, deltaQuantity, reason, note) });
  })
);

export default router;
