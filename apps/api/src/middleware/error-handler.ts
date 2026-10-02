import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[API Error]:', err);
  const status = err.status || 400;
  res.status(status).json({
    error: true,
    message: err.message || 'An unexpected error occurred',
  });
}
