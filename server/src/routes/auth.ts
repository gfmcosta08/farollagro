import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  tenantName: z.string().min(2),
  document: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Register new tenant and user
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: data.tenantName,
        document: data.document,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state
      }
    });

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'ADMIN',
        tenantId: tenant.id
      }
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant.id
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (user.deletedAt) {
      return res.status(401).json({ error: 'Usuário desativado' });
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        areaUnit: user.tenant.areaUnit
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        document: user.tenant.document,
        email: user.tenant.email,
        phone: user.tenant.phone,
        city: user.tenant.city,
        state: user.tenant.state,
        areaUnit: user.tenant.areaUnit
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

export default router;
