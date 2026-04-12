import { Router } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Dashboard summary
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const [
      totalAnimals,
      activeAnimals,
      soldAnimals,
      deadAnimals,
      totalPastures,
      activePastures,
      totalTags,
      availableTags,
      pendingFinances,
      monthlyRevenue,
      monthlyExpense
    ] = await Promise.all([
      prisma.animal.count({ where: { tenantId, deletedAt: null } }),
      prisma.animal.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      prisma.animal.count({ where: { tenantId, status: 'SOLD', deletedAt: null } }),
      prisma.animal.count({ where: { tenantId, status: 'DEAD', deletedAt: null } }),
      prisma.pasture.count({ where: { tenantId, deletedAt: null } }),
      prisma.pasture.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      prisma.tag.count({ where: { tenantId, deletedAt: null } }),
      prisma.tag.count({ where: { tenantId, status: 'AVAILABLE', deletedAt: null } }),
      prisma.finance.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.finance.aggregate({ where: { tenantId, type: 'REVENUE', date: { gte: new Date(new Date().setDate(1)) } }, _sum: { amount: true } }),
      prisma.finance.aggregate({ where: { tenantId, type: 'EXPENSE', date: { gte: new Date(new Date().setDate(1)) } }, _sum: { amount: true } })
    ]);

    res.json({
      animals: {
        total: totalAnimals,
        active: activeAnimals,
        sold: soldAnimals,
        dead: deadAnimals
      },
      pastures: {
        total: totalPastures,
        active: activePastures
      },
      tags: {
        total: totalTags,
        available: availableTags
      },
      finances: {
        pending: pendingFinances,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        monthlyExpense: monthlyExpense._sum.amount || 0,
        monthlyProfit: (monthlyRevenue._sum.amount || 0) - (monthlyExpense._sum.amount || 0)
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

// Animal statistics
router.get('/animals/stats', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const [bySex, byBreed, byStatus, recentBirths, recentDeaths] = await Promise.all([
      prisma.animal.groupBy({
        by: ['sex'],
        where: { tenantId, status: 'ACTIVE', deletedAt: null },
        _count: true
      }),
      prisma.animal.groupBy({
        by: ['breed'],
        where: { tenantId, status: 'ACTIVE', deletedAt: null },
        _count: true
      }),
      prisma.animal.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true
      }),
      prisma.animal.findMany({
        where: { tenantId, origin: 'BIRTH', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, sex: true, breed: true, birthDate: true, createdAt: true }
      }),
      prisma.death.findMany({
        where: { tenantId },
        orderBy: { deathDate: 'desc' },
        take: 10,
        include: { animal: true }
      })
    ]);

    res.json({
      bySex,
      byBreed,
      byStatus,
      recentBirths,
      recentDeaths
    });
  } catch (error) {
    console.error('Animal stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Weight statistics
router.get('/weights/stats', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const weights = await prisma.weight.findMany({
      where: { tenantId },
      include: { animal: true }
    });

    const stats = {
      totalWeight: weights.reduce((sum, w) => sum + w.weight, 0),
      averageWeight: weights.length ? weights.reduce((sum, w) => sum + w.weight, 0) / weights.length : 0,
      minWeight: weights.length ? Math.min(...weights.map(w => w.weight)) : 0,
      maxWeight: weights.length ? Math.max(...weights.map(w => w.weight)) : 0,
      count: weights.length
    };

    // Weight gain per animal
    const animalWeights = await prisma.weight.groupBy({
      by: ['animalId'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { animalId: 'desc' } }
    });

    res.json({ stats, animalWeights: animalWeights.slice(0, 20) });
  } catch (error) {
    console.error('Weight stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de peso' });
  }
});

// Financial reports
router.get('/finances/summary', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(parseInt(year as string), 0, 1);
    const endDate = new Date(parseInt(year as string), 11, 31, 23, 59, 59);

    const finances = await prisma.finance.findMany({
      where: { tenantId, date: { gte: startDate, lte: endDate } }
    });

    const byCategory = await prisma.finance.groupBy({
      by: ['category', 'type'],
      where: { tenantId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    });

    const totalRevenue = finances.filter(f => f.type === 'REVENUE').reduce((sum, f) => sum + f.amount, 0);
    const totalExpense = finances.filter(f => f.type === 'EXPENSE').reduce((sum, f) => sum + f.amount, 0);

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, expense: 0 }));

    finances.forEach(f => {
      monthly[f.date.getMonth()][f.type === 'REVENUE' ? 'revenue' : 'expense'] += f.amount;
    });

    res.json({
      year: parseInt(year as string),
      totalRevenue,
      totalExpense,
      profit: totalRevenue - totalExpense,
      margin: totalRevenue ? ((totalRevenue - totalExpense) / totalRevenue * 100).toFixed(2) : 0,
      byCategory,
      monthly
    });
  } catch (error) {
    console.error('Financial summary error:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
  }
});

// Pasture occupancy
router.get('/pastures/occupancy', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const pastures = await prisma.pasture.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        lots: {
          where: { deletedAt: null },
          include: {
            animals: {
              where: { removedAt: null },
              include: { animal: true }
            }
          }
        }
      }
    });

    const occupancy = pastures.map(pasture => {
      const animals = pasture.lots.flatMap(lot => lot.animals.filter(a => a.animal.status === 'ACTIVE'));
      const totalWeight = animals.reduce((sum, a) => sum + (a.animal.birthWeight || 0), 0);
      const uaCapacity = pasture.capacityUA || 0;
      const currentUA = totalWeight / 450; // 1 UA = 450kg

      return {
        id: pasture.id,
        name: pasture.name,
        area: pasture.area,
        forageType: pasture.forageType,
        animalCount: animals.length,
        totalWeight,
        currentUA: parseFloat(currentUA.toFixed(2)),
        uaCapacity,
        occupancyRate: uaCapacity ? parseFloat(((currentUA / uaCapacity) * 100).toFixed(2)) : 0
      };
    });

    res.json(occupancy);
  } catch (error) {
    console.error('Pasture occupancy error:', error);
    res.status(500).json({ error: 'Erro ao buscar ocupação' });
  }
});

// Mortality rate
router.get('/animals/mortality', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const totalAnimals = await prisma.animal.count({ where: { tenantId, deletedAt: null } });
    const deadAnimals = await prisma.animal.count({ where: { tenantId, status: 'DEAD' } });

    const deaths = await prisma.death.groupBy({
      by: ['cause'],
      where: { tenantId },
      _count: true
    });

    const rate = totalAnimals ? ((deadAnimals / totalAnimals) * 100).toFixed(2) : 0;

    res.json({
      totalAnimals,
      deadAnimals,
      mortalityRate: rate,
      byCause: deaths
    });
  } catch (error) {
    console.error('Mortality error:', error);
    res.status(500).json({ error: 'Erro ao buscar mortalidade' });
  }
});

// Event timeline
router.get('/events/timeline', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const events = await prisma.event.findMany({
      where: {
        tenantId,
        occurredAt: { gte: startDate }
      },
      include: { animal: true },
      orderBy: { occurredAt: 'desc' }
    });

    const byType = await prisma.event.groupBy({
      by: ['type'],
      where: { tenantId, occurredAt: { gte: startDate } },
      _count: true
    });

    res.json({ events, byType, days: parseInt(days as string) });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Erro ao buscar linha do tempo' });
  }
});

export default router;
