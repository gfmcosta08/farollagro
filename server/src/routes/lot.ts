import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createLotSchema = z.object({
  name: z.string().min(1),
  pastureId: z.string().uuid().optional(),
  description: z.string().optional()
});

const updateLotSchema = createLotSchema.partial();

// List lots
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, pastureId, search, page = '1', limit = '50' } = req.query;

    const where: any = {
      tenantId: req.user!.tenantId,
      deletedAt: null
    };

    if (status) where.status = status;
    if (pastureId) where.pastureId = pastureId;
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          pasture: true,
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
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.lot.count({ where })
    ]);

    res.json({
      data: lots,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('List lots error:', error);
    res.status(500).json({ error: 'Erro ao listar lotes' });
  }
});

// Get single lot
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const lot = await prisma.lot.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      },
      include: {
        pasture: true,
        animals: {
          where: { removedAt: null },
          include: {
            animal: {
              include: {
                tags: { include: { tag: true } },
                weights: { orderBy: { weightDate: 'desc' } },
                events: { orderBy: { occurredAt: 'desc' }, take: 10 }
              }
            }
          }
        },
        finances: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    res.json(lot);
  } catch (error) {
    console.error('Get lot error:', error);
    res.status(500).json({ error: 'Erro ao buscar lote' });
  }
});

// Create lot
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createLotSchema.parse(req.body);

    if (data.pastureId) {
      const pasture = await prisma.pasture.findFirst({
        where: { id: data.pastureId, tenantId: req.user!.tenantId, deletedAt: null }
      });
      if (!pasture) {
        return res.status(400).json({ error: 'Pasto não encontrado' });
      }
    }

    const lot = await prisma.lot.create({
      data: {
        tenantId: req.user!.tenantId,
        name: data.name,
        pastureId: data.pastureId,
        description: data.description
      },
      include: { pasture: true }
    });

    res.status(201).json(lot);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create lot error:', error);
    res.status(500).json({ error: 'Erro ao criar lote' });
  }
});

// Update lot
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateLotSchema.parse(req.body);

    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    const updated = await prisma.lot.update({
      where: { id: lot.id },
      data: {
        name: data.name,
        pastureId: data.pastureId,
        description: data.description,
        status: data.status as any
      },
      include: { pasture: true }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update lot error:', error);
    res.status(500).json({ error: 'Erro ao atualizar lote' });
  }
});

// Add animal to lot
router.post('/:id/animals', async (req: AuthRequest, res) => {
  try {
    const { animalId, notes } = req.body;

    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    const animal = await prisma.animal.findFirst({
      where: { id: animalId, tenantId: req.user!.tenantId, status: 'ACTIVE', deletedAt: null }
    });

    if (!animal) {
      return res.status(400).json({ error: 'Animal não encontrado ou não está ativo' });
    }

    // Check if already in another lot
    const existingLot = await prisma.animalLot.findFirst({
      where: { animalId, removedAt: null }
    });

    if (existingLot) {
      return res.status(400).json({ error: 'Animal já está em outro lote' });
    }

    const animalLot = await prisma.animalLot.create({
      data: {
        animalId,
        lotId: lot.id
      },
      include: { animal: true, lot: true }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId,
        type: 'MOVEMENT',
        data: { lotId: lot.id, lotName: lot.name, action: 'ADDED' },
        userId: req.user!.id
      }
    });

    res.status(201).json(animalLot);
  } catch (error) {
    console.error('Add animal to lot error:', error);
    res.status(500).json({ error: 'Erro ao adicionar animal ao lote' });
  }
});

// Remove animal from lot
router.delete('/:id/animals/:animalId', async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;

    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    const animalLot = await prisma.animalLot.findFirst({
      where: { animalId: req.params.animalId, lotId: lot.id, removedAt: null }
    });

    if (!animalLot) {
      return res.status(404).json({ error: 'Animal não está neste lote' });
    }

    await prisma.animalLot.update({
      where: { id: animalLot.id },
      data: { removedAt: new Date(), reason }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: req.params.animalId,
        type: 'MOVEMENT',
        data: { lotId: lot.id, lotName: lot.name, action: 'REMOVED', reason },
        userId: req.user!.id
      }
    });

    res.json({ message: 'Animal removido do lote com sucesso' });
  } catch (error) {
    console.error('Remove animal from lot error:', error);
    res.status(500).json({ error: 'Erro ao remover animal do lote' });
  }
});

// Close lot
router.post('/:id/close', async (req: AuthRequest, res) => {
  try {
    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    // Remove all animals from lot
    await prisma.animalLot.updateMany({
      where: { lotId: lot.id, removedAt: null },
      data: { removedAt: new Date(), reason: 'LOTE_FECHADO' }
    });

    const updated = await prisma.lot.update({
      where: { id: lot.id },
      data: { status: 'CLOSED' }
    });

    res.json(updated);
  } catch (error) {
    console.error('Close lot error:', error);
    res.status(500).json({ error: 'Erro ao fechar lote' });
  }
});

// Delete lot
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lote não encontrado' });
    }

    if (lot.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Não é possível excluir lote ativo. Feche-o primeiro.' });
    }

    await prisma.lot.update({
      where: { id: lot.id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Lote removido com sucesso' });
  } catch (error) {
    console.error('Delete lot error:', error);
    res.status(500).json({ error: 'Erro ao remover lote' });
  }
});

export default router;
