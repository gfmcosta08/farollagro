import { Request, Response, NextFunction } from 'express';

export const syncMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle offline-first sync headers
  const syncHeader = req.headers['x-sync-mode'];
  const deviceId = req.headers['x-device-id'] as string;
  const lastSync = req.headers['x-last-sync'] as string;

  if (syncHeader === 'true') {
    (req as any).syncMode = true;
    (req as any).deviceId = deviceId;
    (req as any).lastSync = lastSync ? new Date(lastSync) : null;
  }

  next();
};
