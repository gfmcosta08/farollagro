import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createPastureSchema = z.object({
  name: z.string().min(1),
  area: z.number().positive(),
  forageType: z.string().optional(),
  capacityUA: z.number().optional(),
  location: z.string().optional(),
  polygon: z.any().optional()
});

const updatePastureSchema = createPastureSchema.partial();

// List pastures
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, search, page = '1', limit = '50' } = req.query;

    const where: any = {
      tenantId: req.user!.tenantId,
      deletedAt: null
    };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [pastures, total] = await Promise.all([
      prisma.pasture.findMany({
        where,
        include: {
          lots: {
            where: { deletedAt: null },
            include: {
              animals: {
                where: { removedAt: null },
                include: { animal: true }
              }
            }
          },
          contracts: {
            where: { status: 'ACTIVE', deletedAt: null }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.pasture.count({ where })
    ]);

    // Calculate current occupation
    const pasturesWithOccupation = pastures.map(pasture => {
      const currentAnimals = pasture.lots
        .flatMap(lot => lot.animals)
        .filter(a => a.animal.status === 'ACTIVE');

      return {
        ...pasture,
        currentAnimals: currentAnimals.length,
        currentWeight: currentAnimals.reduce((sum, a) => sum + (a.animal.birthWeight || 0), 0)
      };
    });

    res.json({
      data: pasturesWithOccupation,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('List pastures error:', error);
    res.status(500).json({ error: 'Erro ao listar pastos' });
  }
});

// Get single pasture
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const pasture = await prisma.pasture.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      },
      include: {
        lots: {
          where: { deletedAt: null },
          include: {
            animals: {
              where: { removedAt: null },
              include: {
                animal: {
                  include: {
                    tags: { include: { tag: true } },
                    weights: { orderBy: { weightDate: 'desc' }, take: 1 }
                  }
                }
              }
            }
          }
        },
        contracts: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' }
        },
        finances: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!pasture) {
      return res.status(404).json({ error: 'Pasto não encontrado' });
    }

    res.json(pasture);
  } catch (error) {
    console.error('Get pasture error:', error);
    res.status(500).json({ error: 'Erro ao buscar pasto' });
  }
});

// Create pasture
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createPastureSchema.parse(req.body);

    const pasture = await prisma.pasture.create({
      data: {
        tenantId: req.user!.tenantId,
        name: data.name,
        area: data.area,
        forageType: data.forageType,
        capacityUA: data.capacityUA,
        location: data.location,
        polygon: data.polygon
      }
    });

    res.status(201).json(pasture);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create pasture error:', error);
    res.status(500).json({ error: 'Erro ao criar pasto' });
  }
});

// Update pasture
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updatePastureSchema.parse(req.body);

    const pasture = await prisma.pasture.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!pasture) {
      return res.status(404).json({ error: 'Pasto não encontrado' });
    }

    const updated = await prisma.pasture.update({
      where: { id: pasture.id },
      data: {
        name: data.name,
        area: data.area,
        forageType: data.forageType,
        capacityUA: data.capacityUA,
        location: data.location,
        polygon: data.polygon,
        status: data.status as any
      }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update pasture error:', error);
    res.status(500).json({ error: 'Erro ao atualizar pasto' });
  }
});

// Delete pasture (soft delete)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const pasture = await prisma.pasture.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!pasture) {
      return res.status(404).json({ error: 'Pasto não encontrado' });
    }

    // Check for active lots
    const activeLots = await prisma.lot.findFirst({
      where: {
        pastureId: pasture.id,
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (activeLots) {
      return res.status(400).json({ error: 'Não é possível excluir pasto com lotes ativos' });
    }

    await prisma.pasture.update({
      where: { id: pasture.id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Pasto removido com sucesso' });
  } catch (error) {
    console.error('Delete pasture error:', error);
    res.status(500).json({ error: 'Erro ao remover pasto' });
  }
});

export default router;
