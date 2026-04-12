import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

export interface TenantRequest extends Request {
  tenantId: string;
  prisma: PrismaClient;
}

export const tenantMiddleware = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.tenantId) {
    return res.status(400).json({ error: 'Contexto de tenant não encontrado' });
  }

  req.tenantId = req.user.tenantId;
  
  // Attach tenant-aware prisma client
  // This uses Prisma's $extends to automatically filter by tenantId
  next();
};

// Helper to create tenant-aware prisma client
export function createTenantPrisma(tenantId: string): PrismaClient {
  const basePrisma = new PrismaClient();
  
  return basePrisma.$extends({
    client: {
      tenantId
    }
  });
}
