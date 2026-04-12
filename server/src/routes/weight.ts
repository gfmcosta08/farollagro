import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createWeightSchema = z.object({
  animalId: z.string().uuid(),
  weight: z.number().positive(),
  weightDate: z.string().datetime().optional(),
  weightType: z.enum(['MANUAL', 'SCALE_AUTO', 'RFID_AUTO']).optional(),
  deviceId: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

// List weights
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { animalId, startDate, endDate, page = '1', limit = '100' } = req.query;

    const where: any = { tenantId: req.user!.tenantId };
    if (animalId) where.animalId = animalId;
    if (startDate || endDate) {
      where.weightDate = {};
      if (startDate) where.weightDate.gte = new Date(startDate as string);
      if (endDate) where.weightDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [weights, total] = await Promise.all([
      prisma.weight.findMany({
        where,
        include: { animal: true },
        orderBy: { weightDate: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.weight.count({ where })
    ]);

    res.json({ data: weights, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (error) {
    console.error('List weights error:', error);
    res.status(500).json({ error: 'Erro ao listar pesos' });
  }
});

// Create weight
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createWeightSchema.parse(req.body);

    const animal = await prisma.animal.findFirst({
      where: { id: data.animalId, tenantId: req.user!.tenantId, status: 'ACTIVE', deletedAt: null }
    });
    if (!animal) return res.status(400).json({ error: 'Animal não encontrado ou não está ativo' });

    const weight = await prisma.weight.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: data.animalId,
        weight: data.weight,
        weightDate: data.weightDate ? new Date(data.weightDate) : new Date(),
        weightType: data.weightType || 'MANUAL',
        deviceId: data.deviceId,
        location: data.location,
        notes: data.notes
      },
      include: { animal: true }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: data.animalId,
        type: 'WEIGHING',
        data: { weight: data.weight, weightId: weight.id },
        userId: req.user!.id
      }
    });

    // Update animal birthWeight if this is the first weight or if it's heavier
    if (!animal.birthWeight || data.weight > animal.birthWeight) {
      await prisma.animal.update({
        where: { id: data.animalId },
        data: { birthWeight: data.weight }
      });
    }

    res.status(201).json(weight);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create weight error:', error);
    res.status(500).json({ error: 'Erro ao registrar peso' });
  }
});

// Batch create weights (from scale/RFID)
router.post('/batch', async (req: AuthRequest, res) => {
  try {
    const { weights } = req.body;

    if (!Array.isArray(weights) || weights.length === 0) {
      return res.status(400).json({ error: 'Lista de pesos vazia' });
    }

    const created = await Promise.all(
      weights.map(async (weightData: any) => {
        const animal = await prisma.animal.findFirst({
          where: { id: weightData.animalId, tenantId: req.user!.tenantId, status: 'ACTIVE' }
        });
        if (!animal) return null;

        return prisma.weight.create({
          data: {
            tenantId: req.user!.tenantId,
            animalId: weightData.animalId,
            weight: weightData.weight,
            weightDate: weightData.weightDate ? new Date(weightData.weightDate) : new Date(),
            weightType: weightData.weightType || 'RFID_AUTO',
            deviceId: weightData.deviceId,
            location: weightData.location
          }
        });
      })
    );

    const validWeights = created.filter(w => w !== null);
    res.status(201).json({ created: validWeights.length, weights: validWeights });
  } catch (error) {
    console.error('Batch create weights error:', error);
    res.status(500).json({ error: 'Erro ao registrar pesos em lote' });
  }
});

export default router;
