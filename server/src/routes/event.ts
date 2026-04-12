import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createEventSchema = z.object({
  animalId: z.string().uuid(),
  type: z.enum(['BIRTH', 'PURCHASE', 'SALE', 'DEATH', 'WEANING', 'VACCINATION', 'DEWORMING', 'WEIGHING', 'MOVEMENT', 'INSEMINATION', 'PREGNANCY_CHECK', 'TAG_ATTACHED', 'TAG_DETACHED', 'BODY_CONDITION_SCORE', 'OTHER']),
  data: z.any(),
  occurredAt: z.string().datetime().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deviceId: z.string().optional()
});

const updateEventSchema = createEventSchema.partial();

// List events
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { animalId, type, startDate, endDate, page = '1', limit = '100' } = req.query;

    const where: any = { tenantId: req.user!.tenantId };
    if (animalId) where.animalId = animalId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate as string);
      if (endDate) where.occurredAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: { animal: true },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.event.count({ where })
    ]);

    res.json({ data: events, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Erro ao listar eventos' });
  }
});

// Get single event
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { animal: true }
    });
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Erro ao buscar evento' });
  }
});

// Create event
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createEventSchema.parse(req.body);

    const animal = await prisma.animal.findFirst({
      where: { id: data.animalId, tenantId: req.user!.tenantId, deletedAt: null }
    });
    if (!animal) return res.status(400).json({ error: 'Animal não encontrado' });

    const event = await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: data.animalId,
        type: data.type,
        data: data.data,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        latitude: data.latitude,
        longitude: data.longitude,
        deviceId: data.deviceId,
        userId: req.user!.id
      },
      include: { animal: true }
    });

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
});

// Batch create events (for offline sync)
router.post('/batch', async (req: AuthRequest, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Lista de eventos vazia' });
    }

    const created = await Promise.all(
      events.map(async (eventData: any) => {
        const animal = await prisma.animal.findFirst({
          where: { id: eventData.animalId, tenantId: req.user!.tenantId }
        });
        if (!animal) return null;

        return prisma.event.create({
          data: {
            tenantId: req.user!.tenantId,
            animalId: eventData.animalId,
            type: eventData.type,
            data: eventData.data,
            occurredAt: eventData.occurredAt ? new Date(eventData.occurredAt) : new Date(),
            latitude: eventData.latitude,
            longitude: eventData.longitude,
            deviceId: eventData.deviceId,
            userId: req.user!.id,
            syncStatus: 'SYNCED'
          }
        });
      })
    );

    const validEvents = created.filter(e => e !== null);
    res.status(201).json({ created: validEvents.length, events: validEvents });
  } catch (error) {
    console.error('Batch create events error:', error);
    res.status(500).json({ error: 'Erro ao criar eventos em lote' });
  }
});

export default router;
