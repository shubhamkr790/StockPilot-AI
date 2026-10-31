import { Router } from 'express';
import { ledgerEngine } from '../db/ledger.ts';
import { requireAuth, signToken, verifyPassword } from '../middleware/auth.ts';
import { handle } from './util.ts';

const router = Router();
const failedAttempts = new Map<string, { count: number; until: number }>();
const DEMO_USERNAMES = ['ramesh', 'priya', 'anita'];

// Only the three seeded demo accounts are listed, so judges can sign in quickly.
router.get('/demo-accounts', (_req, res) => {
  res.json({
    accounts: ledgerEngine
      .listUsers()
      .filter((u) => DEMO_USERNAMES.includes(u.username))
      .map((u) => ({ username: u.username, name: u.name, role: u.role, businessName: ledgerEngine.getBusiness(u.businessId)?.name })),
  });
});

router.post('/login', (req, res) => {
  const identifier = String(req.body?.identifier ?? req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? req.body?.pin ?? '');
  const lock = failedAttempts.get(identifier);
  if (lock && lock.count >= 5 && Date.now() < lock.until) {
    return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many wrong passwords. Try again in a few minutes.' });
  }
  const user = identifier ? ledgerEngine.findUserByLogin(identifier) : undefined;
  if (!user || user.disabled || !verifyPassword(password, user.passwordHash)) {
    const n = (lock && Date.now() < lock.until ? lock.count : 0) + 1;
    failedAttempts.set(identifier, { count: n, until: Date.now() + 5 * 60 * 1000 });
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Wrong email/username or password.' });
  }
  failedAttempts.delete(identifier);
  res.json({ token: signToken(user.id) });
});

// Owner sign-up: creates a new business with its own separate inventory.
router.post(
  '/register',
  handle((req, res) => {
    const user = ledgerEngine.registerOwner(req.body || {});
    res.status(201).json({ token: signToken(user.id) });
  })
);

router.get(
  '/me',
  requireAuth,
  handle((req, res) => {
    const user = ledgerEngine.getUser(req.userId)!;
    res.json({ user: ledgerEngine.publicUser(user), business: ledgerEngine.getBusiness(req.tenantId) });
  })
);

export default router;
