import { Router, Response, Request } from 'express';
import { ledgerEngine } from '../db/ledger.ts';
import { INITIAL_USERS, INITIAL_BUSINESSES } from '../db/seed.ts';

const router = Router();

// GET /api/auth/demo-accounts - List all pre-configured demo personas for 1-click judge switching
router.get('/demo-accounts', (_req: Request, res: Response) => {
  const accounts = INITIAL_USERS.map((user) => {
    const business = INITIAL_BUSINESSES.find((b) => b.id === user.businessId);
    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      businessName: business?.name,
      businessType: business?.type,
      avatarInitials: user.name.slice(0, 2).toUpperCase(),
    };
  });

  res.json({
    success: true,
    accounts,
  });
});

// GET /api/auth/current - Get current session context
router.get('/current', (req: Request, res: Response) => {
  const tenantId = (req.headers['x-business-id'] as string) || 'biz_ramesh_01';
  const userId = (req.headers['x-user-id'] as string) || 'usr_ramesh';

  const business = ledgerEngine.getBusiness(tenantId);
  const user = ledgerEngine.getUser(userId);

  if (!business || !user) {
    return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Invalid tenant or user ID' });
  }

  res.json({
    success: true,
    business,
    user,
    metrics: ledgerEngine.getDashboardMetrics(tenantId),
  });
});

export default router;
