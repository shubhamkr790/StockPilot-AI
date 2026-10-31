import { Router } from 'express';
import { requireRole } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';
import { handle } from './util.ts';

const router = Router();

router.get('/metrics', handle((req, res) => res.json({ metrics: ledgerEngine.getDashboardMetrics(req.tenantId) })));
router.get('/movements', handle((req, res) => res.json({ movements: ledgerEngine.getMovementHistory(req.tenantId, Math.min(Number(req.query.limit) || 100, 500)) })));
router.get('/audit', requireRole(['OWNER']), handle((req, res) => res.json({ audit: ledgerEngine.getAuditLog(req.tenantId, Math.min(Number(req.query.limit) || 100, 500)) })));
router.put('/settings', requireRole(['OWNER']), handle((req, res) => res.json({ business: ledgerEngine.updateSettings(req.tenantId, req.userId, req.body || {}) })));

export default router;
