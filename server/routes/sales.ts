import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';

const router = Router();

// POST /api/sales - Complete atomic POS checkout with race-condition defense
router.post('/', async (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { items, idempotencyKey: bodyKey } = req.body;
    const headerKey = req.headers['x-idempotency-key'] as string | undefined;
    const idempotencyKey = bodyKey || headerKey;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'A sale must contain an array of items with { productId, quantity }.',
      });
    }

    const sale = await ledgerEngine.recordSale(
      authReq.tenantId,
      authReq.userId,
      items,
      idempotencyKey
    );

    res.status(201).json({
      success: true,
      message: 'Sale recorded atomically.',
      sale,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      error: err.code || 'SALE_FAILED',
      message: err.message,
      details: err.details,
    });
  }
});

// GET /api/sales - Get recent sales history for tenant
router.get('/', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const limit = Number(req.query.limit || 50);
    const sales = ledgerEngine.getSalesHistory(authReq.tenantId, limit);
    res.json({ success: true, count: sales.length, sales });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

export default router;
