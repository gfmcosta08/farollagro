import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-change-me'
    ) as AuthUser;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (user.deletedAt) {
      return res.status(401).json({ error: 'Usuário desativado' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Erro na autenticação' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};
