import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../db/ledger.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

/** Wraps a handler so thrown AppErrors become plain-language JSON responses. */
export function handle(fn: (req: AuthenticatedRequest, res: Response) => unknown): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = fn(req as AuthenticatedRequest, res);
      if (out instanceof Promise) out.catch((err) => sendError(res, err));
    } catch (err) {
      sendError(res, err);
    }
  };
}

export function sendError(res: Response, err: any) {
  if (res.headersSent) return;
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message, details: err.details });
  }
  console.error(err);
  res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong on our side. Please try again.' });
}
