import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { swaggerSpec } from './config/swagger';

// Routes
import authRoutes from './routes/auth';
import partnerRoutes from './routes/partners';
import loyaltyRoutes from './routes/loyalty';
import transactionRoutes from './routes/transactions';
import rewardRoutes from './routes/rewards';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';
import referralRoutes from './routes/referrals';
import achievementRoutes from './routes/achievements';


// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

// Export io for use in other modules
export { io };

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (мобильные приложения, Postman)
    if (!origin) return callback(null, true);
    
    // Разрешаем запросы с localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Cloudflare Tunnel
    if (origin.includes('.trycloudflare.com')) {
      return callback(null, true);
    }

    // Allow deployed services (Vercel, Render)
    if (origin.includes('.vercel.app') || origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    // Проверяем разрешенные origins из конфига
    if (config.cors.origin.includes(origin) || config.cors.origin.includes('*')) {
      return callback(null, true);
    }
    
    callback(null, true); // В development разрешаем все
  },
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// Rate limiting
app.use(rateLimiter);

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.app.version,
  });
});

// Dynamic TonConnect Manifest for strict wallet origin matching
app.get('/api/tonconnect-manifest.json', (req, res) => {
  const origin = req.query.origin as string;
  const fallbackUrl = req.headers['x-forwarded-proto'] 
    ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host'] || req.headers.host}`
    : `http://${req.headers.host}`;
  
  res.json({
    url: origin || fallbackUrl,
    name: 'Sweet Loyalty Demo',
    iconUrl: 'https://ton.org/download/ton_symbol.png',
    termsOfUseUrl: 'https://ton.org/terms',
    privacyPolicyUrl: 'https://ton.org/privacy'
  });
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// API v1 routes
const apiPrefix = config.app.apiPrefix;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/partners`, partnerRoutes);
app.use(`${apiPrefix}/loyalty`, loyaltyRoutes);
app.use(`${apiPrefix}/transactions`, transactionRoutes);
app.use(`${apiPrefix}/rewards`, rewardRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/referrals`, referralRoutes);
app.use(`${apiPrefix}/achievements`, achievementRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use('/webhook', webhookRoutes);

// ============================================================================
// SOCKET.IO
// ============================================================================

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:partner', (partnerId: string) => {
    socket.join(`partner:${partnerId}`);
    logger.debug(`Socket ${socket.id} subscribed to partner:${partnerId}`);
  });

  socket.on('unsubscribe:partner', (partnerId: string) => {
    socket.leave(`partner:${partnerId}`);
  });

  socket.on('subscribe:wallet', (walletAddress: string) => {
    socket.join(`wallet:${walletAddress}`);
    logger.debug(`Socket ${socket.id} subscribed to wallet:${walletAddress}`);
  });

  socket.on('unsubscribe:wallet', (walletAddress: string) => {
    socket.leave(`wallet:${walletAddress}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = config.app.port;

if (config.app.env !== 'test') {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    logger.info(`🔗 API Prefix: ${apiPrefix}`);
    logger.info(`🌐 Environment: ${config.app.env}`);
  });
}


// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;







