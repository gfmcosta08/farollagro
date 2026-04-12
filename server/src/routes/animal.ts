import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createAnimalSchema = z.object({
  species: z.enum(['BOVINE', 'EQUINE', 'OVINE', 'CAPRINE']).optional(),
  breed: z.string().optional(),
  sex: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().datetime().optional(),
  birthWeight: z.number().positive().optional(),
  origin: z.enum(['BIRTH', 'PURCHASE', 'TRANSFER']).optional(),
  sireId: z.string().uuid().optional(),
  damId: z.string().uuid().optional()
});

const updateAnimalSchema = createAnimalSchema.partial();
const linkTagSchema = z.object({
  tagId: z.string().uuid(),
  rfid: z.string().optional()
});

// List all animals
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, sex, breed, sireId, damId, lotId, search, page = '1', limit = '50' } = req.query;

    const where: any = {
      tenantId: req.user!.tenantId,
      deletedAt: null
    };

    if (status) where.status = status;
    if (sex) where.sex = sex;
    if (breed) where.breed = breed;
    if (sireId) where.sireId = sireId;
    if (damId) where.damId = damId;

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (lotId) {
      where.lots = {
        some: {
          lotId: lotId as string,
          removedAt: null
        }
      };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [animals, total] = await Promise.all([
      prisma.animal.findMany({
        where,
        include: {
          tags: {
            where: { unlinkedAt: null },
            include: { tag: true }
          },
          sire: true,
          dam: true,
          weights: {
            orderBy: { weightDate: 'desc' },
            take: 1
          },
          lots: {
            where: { removedAt: null },
            include: { lot: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.animal.count({ where })
    ]);

    res.json({
      data: animals,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('List animals error:', error);
    res.status(500).json({ error: 'Erro ao listar animais' });
  }
});

// Get single animal with full history
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      },
      include: {
        tags: {
          include: { tag: true }
        },
        sire: true,
        dam: true,
        offspring: true,
        daughters: true,
        weights: {
          orderBy: { weightDate: 'desc' }
        },
        events: {
          orderBy: { occurredAt: 'desc' }
        },
        purchases: true,
        sales: true,
        deaths: true,
        lots: {
          where: { removedAt: null },
          include: { lot: true }
        },
        finances: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    res.json(animal);
  } catch (error) {
    console.error('Get animal error:', error);
    res.status(500).json({ error: 'Erro ao buscar animal' });
  }
});

// Create animal (birth or purchase)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createAnimalSchema.parse(req.body);

    const animal = await prisma.animal.create({
      data: {
        tenantId: req.user!.tenantId,
        species: data.species || 'BOVINE',
        breed: data.breed,
        sex: data.sex,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        birthWeight: data.birthWeight,
        origin: data.origin || 'BIRTH',
        sireId: data.sireId,
        damId: data.damId,
        status: 'ACTIVE'
      },
      include: {
        sire: true,
        dam: true
      }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        type: animal.origin === 'BIRTH' ? 'BIRTH' : 'PURCHASE',
        data: {
          species: animal.species,
          breed: animal.breed,
          sex: animal.sex,
          birthDate: animal.birthDate,
          sireId: animal.sireId,
          damId: animal.damId
        },
        userId: req.user!.id
      }
    });

    res.status(201).json(animal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create animal error:', error);
    res.status(500).json({ error: 'Erro ao criar animal' });
  }
});

// Update animal
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateAnimalSchema.parse(req.body);

    const existing = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    const animal = await prisma.animal.update({
      where: { id: req.params.id },
      data: {
        breed: data.breed,
        sireId: data.sireId,
        damId: data.damId
      },
      include: {
        sire: true,
        dam: true,
        tags: { include: { tag: true } }
      }
    });

    res.json(animal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update animal error:', error);
    res.status(500).json({ error: 'Erro ao atualizar animal' });
  }
});

// Link tag to animal
router.post('/:id/tags', async (req: AuthRequest, res) => {
  try {
    const { tagId } = linkTagSchema.parse(req.body);

    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        tenantId: req.user!.tenantId,
        status: { in: ['AVAILABLE', 'LOST', 'DAMAGED'] }
      }
    });

    if (!tag) {
      return res.status(400).json({ error: 'Tag não disponível' });
    }

    // Check if tag is already linked to another active animal
    const existingLink = await prisma.animalTag.findFirst({
      where: {
        tagId: tagId,
        unlinkedAt: null
      }
    });

    if (existingLink) {
      return res.status(400).json({ error: 'Tag já está vinculada a outro animal' });
    }

    // Unlink any existing tags from this animal
    await prisma.animalTag.updateMany({
      where: {
        animalId: animal.id,
        unlinkedAt: null
      },
      data: {
        unlinkedAt: new Date(),
        reason: 'TROCA'
      }
    });

    // Link tag to animal
    const animalTag = await prisma.animalTag.create({
      data: {
        animalId: animal.id,
        tagId: tagId
      },
      include: { tag: true }
    });

    // Update tag status
    await prisma.tag.update({
      where: { id: tagId },
      data: { status: 'ACTIVE' }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        type: 'TAG_ATTACHED',
        data: {
          tagId: tagId,
          tagNumber: tag.number,
          rfid: tag.rfid
        },
        userId: req.user!.id
      }
    });

    // Tag history
    await prisma.tagHistory.create({
      data: {
        tagId: tagId,
        animalId: animal.id,
        action: 'LINKED'
      }
    });

    res.status(201).json(animalTag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Link tag error:', error);
    res.status(500).json({ error: 'Erro ao vincular tag' });
  }
});

// Unlink tag from animal
router.delete('/:id/tags/:tagId', async (req: AuthRequest, res) => {
  try {
    const { reason = 'REMOVED' } = req.body;

    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    const animalTag = await prisma.animalTag.findFirst({
      where: {
        animalId: animal.id,
        tagId: req.params.tagId,
        unlinkedAt: null
      },
      include: { tag: true }
    });

    if (!animalTag) {
      return res.status(404).json({ error: 'Tag não vinculada a este animal' });
    }

    // Unlink
    await prisma.animalTag.update({
      where: { id: animalTag.id },
      data: {
        unlinkedAt: new Date(),
        reason
      }
    });

    // Update tag status to available
    await prisma.tag.update({
      where: { id: req.params.tagId },
      data: { status: 'AVAILABLE' }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        type: 'TAG_DETACHED',
        data: {
          tagId: req.params.tagId,
          tagNumber: animalTag.tag.number,
          reason
        },
        userId: req.user!.id
      }
    });

    // Tag history
    await prisma.tagHistory.create({
      data: {
        tagId: req.params.tagId,
        animalId: animal.id,
        action: 'UNLINKED'
      }
    });

    res.json({ message: 'Tag desvinculada com sucesso' });
  } catch (error) {
    console.error('Unlink tag error:', error);
    res.status(500).json({ error: 'Erro ao desvincular tag' });
  }
});

// Get animal genealogy
router.get('/:id/genealogy', async (req: AuthRequest, res) => {
  try {
    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      },
      include: {
        sire: {
          include: {
            sire: { include: { sire: true, dam: true } },
            dam: { include: { sire: true, dam: true } }
          }
        },
        dam: {
          include: {
            sire: { include: { sire: true, dam: true } },
            dam: { include: { sire: true, dam: true } }
          }
        },
        offspring: true,
        daughters: true
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    // Build genealogy tree
    const genealogy = {
      id: animal.id,
      sex: animal.sex,
      breed: animal.breed,
      sire: animal.sire ? {
        id: animal.sire.id,
        breed: animal.sire.breed,
        sire: animal.sire.sire ? {
          id: animal.sire.sire.id,
          breed: animal.sire.sire.breed,
          sire: animal.sire.sire.sire,
          dam: animal.sire.sire.dam
        } : null,
        dam: animal.sire.dam ? {
          id: animal.sire.dam.id,
          breed: animal.sire.dam.breed,
          sire: animal.sire.dam.sire,
          dam: animal.sire.dam.dam
        } : null
      } : null,
      dam: animal.dam ? {
        id: animal.dam.id,
        breed: animal.dam.breed,
        sire: animal.dam.sire ? {
          id: animal.dam.sire.id,
          breed: animal.dam.sire.breed,
          sire: animal.dam.sire.sire,
          dam: animal.dam.sire.dam
        } : null,
        dam: animal.dam.dam ? {
          id: animal.dam.dam.id,
          breed: animal.dam.dam.breed,
          sire: animal.dam.dam.sire,
          dam: animal.dam.dam.dam
        } : null
      } : null
    };

    res.json(genealogy);
  } catch (error) {
    console.error('Get genealogy error:', error);
    res.status(500).json({ error: 'Erro ao buscar genealogia' });
  }
});

// Record purchase
router.post('/:id/purchase', async (req: AuthRequest, res) => {
  try {
    const { purchaseDate, price, supplier, supplierDoc, gta, notes } = req.body;

    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    const purchase = await prisma.purchase.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        purchaseDate: new Date(purchaseDate),
        price,
        supplier,
        supplierDoc,
        gta,
        notes
      }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        type: 'PURCHASE',
        data: { purchaseId: purchase.id, price, purchaseDate },
        userId: req.user!.id
      }
    });

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Record purchase error:', error);
    res.status(500).json({ error: 'Erro ao registrar compra' });
  }
});

// Record sale
router.post('/:id/sale', async (req: AuthRequest, res) => {
  try {
    const { saleDate, price, buyer, buyerDoc, gta, weight, notes } = req.body;

    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        status: 'ACTIVE'
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado ou já finalizado' });
    }

    const sale = await prisma.sale.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        saleDate: new Date(saleDate),
        price,
        buyer,
        buyerDoc,
        gta,
        weight,
        notes
      }
    });

    // Update animal status
    await prisma.animal.update({
      where: { id: animal.id },
      data: { status: 'SOLD' }
    });

    // Unlink all tags
    await prisma.animalTag.updateMany({
      where: {
        animalId: animal.id,
        unlinkedAt: null
      },
      data: {
        unlinkedAt: new Date(),
        reason: 'VENDA'
      }
    });

    await prisma.tag.updateMany({
      where: {
        id: { in: animal.tags.map(t => t.tagId) }
      },
      data: { status: 'AVAILABLE' }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        type: 'SALE',
        data: { saleId: sale.id, price, saleDate },
        userId: req.user!.id
      }
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Record sale error:', error);
    res.status(500).json({ error: 'Erro ao registrar venda' });
  }
});

// Record death
router.post('/:id/death', async (req: AuthRequest, res) => {
  try {
    const { deathDate, cause, notes } = req.body;

    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        status: 'ACTIVE'
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado ou já finalizado' });
    }

    const death = await prisma.death.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        deathDate: new Date(deathDate),
        cause,
        notes
      }
    });

    // Update animal status
    await prisma.animal.update({
      where: { id: animal.id },
      data: { status: 'DEAD' }
    });

    // Unlink all tags
    await prisma.animalTag.updateMany({
      where: {
        animalId: animal.id,
        unlinkedAt: null
      },
      data: {
        unlinkedAt: new Date(),
        reason: 'MORTE'
      }
    });

    await prisma.tag.updateMany({
      where: {
        id: { in: animal.tags.map(t => t.tagId) }
      },
      data: { status: 'AVAILABLE' }
    });

    // Record event
    await prisma.event.create({
      data: {
        tenantId: req.user!.tenantId,
        animalId: animal.id,
        type: 'DEATH',
        data: { deathId: death.id, cause, deathDate },
        userId: req.user!.id
      }
    });

    res.status(201).json(death);
  } catch (error) {
    console.error('Record death error:', error);
    res.status(500).json({ error: 'Erro ao registrar morte' });
  }
});

// Delete animal (soft delete)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const animal = await prisma.animal.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!animal) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    await prisma.animal.update({
      where: { id: animal.id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Animal removido com sucesso' });
  } catch (error) {
    console.error('Delete animal error:', error);
    res.status(500).json({ error: 'Erro ao remover animal' });
  }
});

export default router;
