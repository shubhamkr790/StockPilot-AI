import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { ledgerEngine } from '../db/ledger.ts';

export interface AuthenticatedRequest extends Request {
  tenantId: string;
  userId: string;
  userRole: 'OWNER' | 'STAFF';
  userName: string;
}

// In production set SESSION_SECRET; otherwise tokens are only valid until the server restarts.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/** Token = base64url(payload).HMAC-SHA256. The client can read it but cannot forge or alter it. */
export function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof uid === 'string' && Date.now() < exp ? uid : null;
  } catch {
    return null;
  }
}

/** The business and role come only from the signed token — never from headers, query or body. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const userId = header.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
  const user = userId ? ledgerEngine.getUser(userId) : undefined;
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please sign in again.' });
  }
  const authReq = req as AuthenticatedRequest;
  authReq.tenantId = user.businessId;
  authReq.userId = user.id;
  authReq.userRole = user.role;
  authReq.userName = user.name;
  next();
}

export function requireRole(allowedRoles: ('OWNER' | 'STAFF')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!allowedRoles.includes(authReq.userRole)) {
      return res.status(403).json({
        error: 'FORBIDDEN_ROLE',
        message: 'Only the shop owner can do this.',
      });
    }
    next();
  };
}
