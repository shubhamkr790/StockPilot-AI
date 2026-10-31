import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';

const router = Router();

// GET /api/ledger/movements - Audit trail of all inventory movements
router.get('/movements', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const limit = Number(req.query.limit || 100);
    const movements = ledgerEngine.getMovementHistory(authReq.tenantId, limit);

    res.json({
      success: true,
      count: movements.length,
      movements,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/ledger/metrics - Executive dashboard metrics
router.get('/metrics', (req, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const metrics = ledgerEngine.getDashboardMetrics(authReq.tenantId);
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.code || 'SERVER_ERROR', message: err.message });
  }
});

export default router;
