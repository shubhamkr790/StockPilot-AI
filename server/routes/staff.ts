import { Router } from 'express';
import { requireRole } from '../middleware/auth.ts';
import { ledgerEngine } from '../db/ledger.ts';
import { handle } from './util.ts';

const router = Router();
router.use(requireRole(['OWNER']));

router.get('/', handle((req, res) => res.json({ users: ledgerEngine.listStaff(req.tenantId) })));
router.post('/', handle((req, res) => res.status(201).json({ user: ledgerEngine.createStaff(req.tenantId, req.userId, req.body || {}) })));
router.delete(
  '/:id',
  handle((req, res) => {
    ledgerEngine.removeStaff(req.tenantId, req.userId, req.params.id);
    res.json({ message: 'Staff member removed. They can no longer sign in.' });
  })
);

export default router;
