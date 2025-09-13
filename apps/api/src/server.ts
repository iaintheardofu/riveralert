import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import alertRoutes from './routes/alerts';
import readingRoutes from './routes/readings';
import crossingRoutes from './routes/crossings';
import routeRoutes from './routes/routes';
import healthRoutes from './routes/health';
import adminRoutes from './routes/admin';
import { initializeJobs } from './jobs/scheduler';
import { initializeSupabase } from './services/supabase';
import path from 'path';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// API Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  logger.error('Failed to load OpenAPI documentation', error);
}

// Public routes
app.use('/v1/health', healthRoutes);
app.use('/v1/alerts', alertRoutes);
app.use('/v1/crossings', crossingRoutes);

// Protected routes
app.use('/v1/readings', authMiddleware('hmac'), readingRoutes);
app.use('/v1/routes', authMiddleware('jwt'), routeRoutes);

// Admin routes
app.use('/admin', authMiddleware('admin'), adminRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'The requested resource was not found'
  });
});

// Initialize services
async function startServer() {
  try {
    // Initialize Supabase connection
    await initializeSupabase();
    logger.info('Supabase connection established');

    // Initialize background jobs
    await initializeJobs();
    logger.info('Background jobs initialized');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 RiverAlert API running on port ${PORT}`);
      logger.info(`📚 API Documentation available at http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();