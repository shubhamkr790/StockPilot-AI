import { Request, Response, NextFunction } from 'express';
import { ledgerEngine } from '../db/ledger.ts';

export interface AuthenticatedRequest extends Request {
  tenantId: string;
  userId: string;
  userRole: 'OWNER' | 'STAFF';
  userName: string;
}

export function tenantAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Read tenant and user from headers (or query params for testing/debugging)
  const tenantId = (req.headers['x-business-id'] as string) || (req.query.businessId as string) || 'biz_ramesh_01';
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'usr_ramesh';

  const business = ledgerEngine.getBusiness(tenantId);
  if (!business) {
    return res.status(404).json({
      error: 'TENANT_NOT_FOUND',
      message: `Business tenant with ID '${tenantId}' does not exist.`,
    });
  }

  const user = ledgerEngine.getUser(userId);
  if (!user || user.businessId !== tenantId) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_USER',
      message: `User '${userId}' is not authorized for business tenant '${tenantId}'.`,
    });
  }

  (req as AuthenticatedRequest).tenantId = tenantId;
  (req as AuthenticatedRequest).userId = userId;
  (req as AuthenticatedRequest).userRole = user.role;
  (req as AuthenticatedRequest).userName = user.name;

  next();
}

export function requireRole(allowedRoles: ('OWNER' | 'STAFF')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!allowedRoles.includes(authReq.userRole)) {
      return res.status(403).json({
        error: 'FORBIDDEN_ROLE',
        message: `Action denied. This operation requires one of: [${allowedRoles.join(', ')}]. Current role: '${authReq.userRole}'.`,
      });
    }
    next();
  };
}
