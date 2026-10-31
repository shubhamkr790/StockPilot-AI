import { Router } from 'express';
import { ledgerEngine } from '../db/ledger.ts';
import { requireAuth, signToken } from '../middleware/auth.ts';
import { handle } from './util.ts';

const router = Router();
const failedAttempts = new Map<string, { count: number; until: number }>();

// Demo accounts are listed so judges can sign in quickly. PINs are documented in the README.
router.get('/demo-accounts', (_req, res) => {
  res.json({
    accounts: ledgerEngine.listUsers().map((u) => ({
      username: u.username,
      name: u.name,
      role: u.role,
      businessName: ledgerEngine.getBusiness(u.businessId)?.name,
    })),
  });
});

router.post('/login', (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const pin = String(req.body?.pin || '');
  const lock = failedAttempts.get(username);
  if (lock && lock.count >= 5 && Date.now() < lock.until) {
    return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many wrong PINs. Try again in a few minutes.' });
  }
  const user = ledgerEngine.findUserByUsername(username);
  if (!user || user.pin !== pin) {
    const n = (lock && Date.now() < lock.until ? lock.count : 0) + 1;
    failedAttempts.set(username, { count: n, until: Date.now() + 5 * 60 * 1000 });
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Wrong username or PIN.' });
  }
  failedAttempts.delete(username);
  res.json({ token: signToken(user.id) });
});

router.get(
  '/me',
  requireAuth,
  handle((req, res) => {
    const user = ledgerEngine.getUser(req.userId)!;
    res.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      business: ledgerEngine.getBusiness(req.tenantId),
    });
  })
);

export default router;
