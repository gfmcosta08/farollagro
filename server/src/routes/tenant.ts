import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  areaUnit: z.enum(['HECTARE', 'ALQUEIRE_PAULISTA', 'ALQUEIRE_MINEIRO', 'ALQUEIRE_BAIANO']).optional()
});

// Get tenant profile
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user!.tenantId },
      include: {
        _count: {
          select: {
            animals: { where: { status: 'ACTIVE', deletedAt: null } },
            tags: { where: { deletedAt: null } },
            pastures: { where: { deletedAt: null } },
            users: { where: { deletedAt: null } }
          }
        }
      }
    });

    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    res.json(tenant);
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Update tenant
router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = updateTenantSchema.parse(req.body);

    const tenant = await prisma.tenant.update({
      where: { id: req.user!.tenantId },
      data
    });

    res.json(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
