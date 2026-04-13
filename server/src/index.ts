import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenant.js';
import animalRoutes from './routes/animal.js';
import tagRoutes from './routes/tag.js';
import pastureRoutes from './routes/pasture.js';
import lotRoutes from './routes/lot.js';
import contractRoutes from './routes/contract.js';
import financeRoutes from './routes/finance.js';
import eventRoutes from './routes/event.js';
import weightRoutes from './routes/weight.js';
import reportRoutes from './routes/report.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/errorHandler.js';
import { syncMiddleware } from './middleware/sync.js';

dotenv.config();

export const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendBuildPath = path.resolve(__dirname, '../public');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API version
app.get('/api/v1', (req, res) => {
  res.json({ 
    version: '1.0.0', 
    name: 'FarollAgro API',
    description: 'SaaS Pecuária de Precisão'
  });
});

// Public routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);

// Protected routes (require authentication)
app.use('/api/v1/animals', authMiddleware, tenantMiddleware, animalRoutes);
app.use('/api/v1/tags', authMiddleware, tenantMiddleware, tagRoutes);
app.use('/api/v1/pastures', authMiddleware, tenantMiddleware, pastureRoutes);
app.use('/api/v1/lots', authMiddleware, tenantMiddleware, lotRoutes);
app.use('/api/v1/contracts', authMiddleware, tenantMiddleware, contractRoutes);
app.use('/api/v1/finances', authMiddleware, tenantMiddleware, financeRoutes);
app.use('/api/v1/events', authMiddleware, tenantMiddleware, syncMiddleware, eventRoutes);
app.use('/api/v1/weights', authMiddleware, tenantMiddleware, weightRoutes);
app.use('/api/v1/reports', authMiddleware, tenantMiddleware, reportRoutes);

// Sync endpoint for offline-first
app.post('/api/v1/sync', authMiddleware, tenantMiddleware, syncMiddleware, async (req, res) => {
  // Handle offline sync
});

if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));

  // SPA fallback for client-side routes, excluding API and health endpoints.
  app.get(/^\/(?!api|health).*/, (_req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🐂 FarollAgro API running on port ${PORT}`);
});

export default app;
