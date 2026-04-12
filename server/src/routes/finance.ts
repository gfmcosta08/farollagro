import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createFinanceSchema = z.object({
  type: z.enum(['EXPENSE', 'REVENUE']),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number(),
  date: z.string().datetime(),
  animalId: z.string().uuid().optional(),
  pastureId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  lotId: z.string().uuid().optional(),
  allocationType: z.enum(['PER_HEAD', 'PER_AREA', 'PER_DAY', 'FIXED']).optional(),
  allocationValue: z.number().optional(),
  notes: z.string().optional()
});

const updateFinanceSchema = createFinanceSchema.partial();

// List finances
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { type, category, status, animalId, pastureId, lotId, startDate, endDate, page = '1', limit = '50' } = req.query;

    const where: any = { tenantId: req.user!.tenantId };
    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (animalId) where.animalId = animalId;
    if (pastureId) where.pastureId = pastureId;
    if (lotId) where.lotId = lotId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [finances, total] = await Promise.all([
      prisma.finance.findMany({
        where,
        include: { animal: true, pasture: true, contract: true, lot: true },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.finance.count({ where })
    ]);

    // Calculate totals
    const totals = finances.reduce((acc, f) => {
      if (f.type === 'REVENUE') acc.revenue += f.amount;
      else acc.expense += f.amount;
      return acc;
    }, { revenue: 0, expense: 0 });

    res.json({
      data: finances,
      totals,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) }
    });
  } catch (error) {
    console.error('List finances error:', error);
    res.status(500).json({ error: 'Erro ao listar finanças' });
  }
});

// Get single finance
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const finance = await prisma.finance.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { animal: true, pasture: true, contract: true, lot: true }
    });
    if (!finance) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json(finance);
  } catch (error) {
    console.error('Get finance error:', error);
    res.status(500).json({ error: 'Erro ao buscar registro' });
  }
});

// Create finance
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createFinanceSchema.parse(req.body);

    const finance = await prisma.finance.create({
      data: {
        tenantId: req.user!.tenantId,
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date),
        animalId: data.animalId,
        pastureId: data.pastureId,
        contractId: data.contractId,
        lotId: data.lotId,
        allocationType: data.allocationType,
        allocationValue: data.allocationValue
      },
      include: { animal: true, pasture: true, lot: true }
    });

    res.status(201).json(finance);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create finance error:', error);
    res.status(500).json({ error: 'Erro ao criar registro' });
  }
});

// Update finance
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateFinanceSchema.parse(req.body);

    const finance = await prisma.finance.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId }
    });
    if (!finance) return res.status(404).json({ error: 'Registro não encontrado' });

    const updated = await prisma.finance.update({
      where: { id: finance.id },
      data: {
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: data.date ? new Date(data.date) : undefined,
        animalId: data.animalId,
        pastureId: data.pastureId,
        contractId: data.contractId,
        lotId: data.lotId,
        allocationType: data.allocationType,
        allocationValue: data.allocationValue,
        status: data.status
      }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Update finance error:', error);
    res.status(500).json({ error: 'Erro ao atualizar registro' });
  }
});

// Delete finance
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const finance = await prisma.finance.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId }
    });
    if (!finance) return res.status(404).json({ error: 'Registro não encontrado' });

    await prisma.finance.delete({ where: { id: finance.id } });
    res.json({ message: 'Registro removido com sucesso' });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ error: 'Erro ao remover registro' });
  }
});

// Get financial summary
router.get('/summary/monthly', async (req: AuthRequest, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(parseInt(year as string), 0, 1);
    const endDate = new Date(parseInt(year as string), 11, 31);

    const finances = await prisma.finance.findMany({
      where: {
        tenantId: req.user!.tenantId,
        date: { gte: startDate, lte: endDate }
      }
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 0,
      expense: 0
    }));

    finances.forEach(f => {
      const month = f.date.getMonth();
      if (f.type === 'REVENUE') monthly[month].revenue += f.amount;
      else monthly[month].expense += f.amount;
    });

    const totals = finances.reduce((acc, f) => {
      if (f.type === 'REVENUE') acc.revenue += f.amount;
      else acc.expense += f.amount;
      return acc;
    }, { revenue: 0, expense: 0 });

    res.json({ monthly, totals, profit: totals.revenue - totals.expense });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

// Get categories
router.get('/categories', async (req: AuthRequest, res) => {
  try {
    const categories = await prisma.finance.groupBy({
      by: ['category'],
      where: { tenantId: req.user!.tenantId },
      _count: true
    });
    res.json(categories.map(c => ({ category: c.category, count: c._count })));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

export default router;
