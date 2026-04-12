import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createContractSchema = z.object({
  pastureId: z.string().uuid(),
  name: z.string().min(1),
  billingType: z.enum(['PER_HEAD', 'PER_AREA', 'FIXED', 'HYBRID']),
  pricePerHead: z.number().optional(),
  pricePerArea: z.number().optional(),
  priceTotal: z.number().optional(),
  billingCycle: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

const updateContractSchema = createContractSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED']).optional()
});

// List contracts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, pastureId, page = '1', limit = '50' } = req.query;

    const where: any = { tenantId: req.user!.tenantId, deletedAt: null };
    if (status) where.status = status;
    if (pastureId) where.pastureId = pastureId as string;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: { pasture: true },
        orderBy: { startDate: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.contract.count({ where })
    ]);

    res.json({ data: contracts, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (error) {
    console.error('List contracts error:', error);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

// Get single contract
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null },
      include: {
        pasture: { include: { lots: { where: { deletedAt: null } } } },
        finances: { orderBy: { date: 'desc' } }
      }
    });

    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
    res.json(contract);
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: 'Erro ao buscar contrato' });
  }
});

// Create contract
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createContractSchema.parse(req.body);

    const pasture = await prisma.pasture.findFirst({
      where: { id: data.pastureId, tenantId: req.user!.tenantId, deletedAt: null }
    });
    if (!pasture) return res.status(400).json({ error: 'Pasto não encontrado' });

    const contract = await prisma.contract.create({
      data: {
        tenantId: req.user!.tenantId,
        pastureId: data.pastureId,
        name: data.name,
        billingType: data.billingType,
        pricePerHead: data.pricePerHead,
        pricePerArea: data.pricePerArea,
        priceTotal: data.priceTotal,
        billingCycle: data.billingCycle,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null
      },
      include: { pasture: true }
    });

    res.status(201).json(contract);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Erro ao criar contrato' });
  }
});

// Update contract
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateContractSchema.parse(req.body);

    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        name: data.name,
        billingType: data.billingType,
        pricePerHead: data.pricePerHead,
        pricePerArea: data.pricePerArea,
        priceTotal: data.priceTotal,
        billingCycle: data.billingCycle,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status
      },
      include: { pasture: true }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Erro ao atualizar contrato' });
  }
});

// Calculate billing for contract
router.get('/:id/billing', async (req: AuthRequest, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null },
      include: { pasture: true }
    });
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    // Get current animals in pasture
    const animals = await prisma.animalLot.findMany({
      where: { lot: { pastureId: contract.pastureId }, removedAt: null },
      include: { animal: true }
    });

    const animalCount = animals.filter(a => a.animal.status === 'ACTIVE').length;
    const totalWeight = animals.reduce((sum, a) => sum + (a.animal.birthWeight || 0), 0);
    const area = contract.pasture.area;

    let amount = 0;
    switch (contract.billingType) {
      case 'PER_HEAD': amount = (contract.pricePerHead || 0) * animalCount; break;
      case 'PER_AREA': amount = (contract.pricePerArea || 0) * area; break;
      case 'FIXED': amount = contract.priceTotal || 0; break;
      case 'HYBRID': amount = (contract.pricePerHead || 0) * animalCount + (contract.pricePerArea || 0) * area; break;
    }

    res.json({
      animalCount,
      totalWeight,
      area,
      amount,
      contract
    });
  } catch (error) {
    console.error('Calculate billing error:', error);
    res.status(500).json({ error: 'Erro ao calcular cobrança' });
  }
});

// Delete contract
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, deletedAt: null }
    });
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    if (contract.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Não é possível excluir contrato ativo. Suspenda-o primeiro.' });
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Contrato removido com sucesso' });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: 'Erro ao remover contrato' });
  }
});

export default router;
