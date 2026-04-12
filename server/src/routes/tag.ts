import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createTagSchema = z.object({
  number: z.string().min(1),
  rfid: z.string().optional(),
  type: z.enum(['EAR_TAG', 'RFID', 'COLLAR', 'BOLUS']).optional()
});

const updateTagSchema = z.object({
  status: z.enum(['AVAILABLE', 'LOST', 'DAMAGED']).optional()
});

// List all tags
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, search, page = '1', limit = '100' } = req.query;

    const where: any = {
      tenantId: req.user!.tenantId,
      deletedAt: null
    };

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { rfid: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        include: {
          animalTags: {
            where: { unlinkedAt: null },
            include: { animal: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.tag.count({ where })
    ]);

    res.json({
      data: tags,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('List tags error:', error);
    res.status(500).json({ error: 'Erro ao listar tags' });
  }
});

// Get single tag with history
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const tag = await prisma.tag.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      },
      include: {
        animalTags: {
          include: { animal: true },
          orderBy: { linkedAt: 'desc' }
        },
        tagHistory: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag não encontrada' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ error: 'Erro ao buscar tag' });
  }
});

// Create tag(s)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createTagSchema.parse(req.body);

    // Check if number already exists
    const existing = await prisma.tag.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        number: data.number,
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Número de tag já cadastrado' });
    }

    const tag = await prisma.tag.create({
      data: {
        tenantId: req.user!.tenantId,
        number: data.number,
        rfid: data.rfid,
        type: data.type || 'EAR_TAG',
        status: 'AVAILABLE'
      }
    });

    // Tag history
    await prisma.tagHistory.create({
      data: {
        tagId: tag.id,
        action: 'CREATED'
      }
    });

    res.status(201).json(tag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Erro ao criar tag' });
  }
});

// Create multiple tags (batch)
router.post('/batch', async (req: AuthRequest, res) => {
  try {
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Lista de tags vazia' });
    }

    const createdTags = await Promise.all(
      tags.map(async (tagData: { number: string; rfid?: string; type?: string }) => {
        const existing = await prisma.tag.findFirst({
          where: {
            tenantId: req.user!.tenantId,
            number: tagData.number,
            deletedAt: null
          }
        });

        if (existing) {
          return null;
        }

        const tag = await prisma.tag.create({
          data: {
            tenantId: req.user!.tenantId,
            number: tagData.number,
            rfid: tagData.rfid,
            type: (tagData.type as any) || 'EAR_TAG',
            status: 'AVAILABLE'
          }
        });

        await prisma.tagHistory.create({
          data: {
            tagId: tag.id,
            action: 'CREATED'
          }
        });

        return tag;
      })
    );

    const validTags = createdTags.filter(t => t !== null);

    res.status(201).json({
      created: validTags.length,
      failed: tags.length - validTags.length,
      tags: validTags
    });
  } catch (error) {
    console.error('Batch create tags error:', error);
    res.status(500).json({ error: 'Erro ao criar tags em lote' });
  }
});

// Update tag
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateTagSchema.parse(req.body);

    const tag = await prisma.tag.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag não encontrada' });
    }

    const updated = await prisma.tag.update({
      where: { id: tag.id },
      data: {
        status: data.status,
        rfid: req.body.rfid
      }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Erro ao atualizar tag' });
  }
});

// Delete tag (soft delete)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const tag = await prisma.tag.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        deletedAt: null
      }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag não encontrada' });
    }

    // Check if tag is linked to active animal
    const activeLink = await prisma.animalTag.findFirst({
      where: {
        tagId: tag.id,
        unlinkedAt: null
      }
    });

    if (activeLink) {
      return res.status(400).json({ error: 'Não é possível excluir tag vinculada a animal ativo' });
    }

    await prisma.tag.update({
      where: { id: tag.id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Tag removida com sucesso' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Erro ao remover tag' });
  }
});

// Find tag by number or RFID
router.get('/search/:query', async (req: AuthRequest, res) => {
  try {
    const { query } = req.params;

    const tag = await prisma.tag.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        OR: [
          { number: query },
          { rfid: query }
        ],
        deletedAt: null
      },
      include: {
        animalTags: {
          where: { unlinkedAt: null },
          include: { animal: true }
        }
      }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag não encontrada' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Search tag error:', error);
    res.status(500).json({ error: 'Erro ao buscar tag' });
  }
});

export default router;
