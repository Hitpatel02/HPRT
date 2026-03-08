require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Server: SocketIOServer } = require('socket.io');

const { logger } = require('./utils/logger');
const { stopBoss } = require('./jobs/boss');
const { shutdown: shutdownWhatsApp } = require('./config/whatsappClient');
const { setupWhatsAppSocket } = require('./sockets/whatsappSocket');
const documentService = require('./services/documentService');
const { getPreviousMonthFormatted } = require('./utils/dateUtils');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const clientRoutes = require('./routes/clientRoutes');
const documentRoutes = require('./routes/documentRoutes');
const pendingDocumentRoutes = require('./routes/pendingDocumentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const logsRoutes = require('./routes/logsRoutes');
const agreementRoutes = require('./routes/agreementRoutes');

const { initializeScheduledTasks } = require('./services/schedulerService');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 8080;

/* ---------------- SECURITY MIDDLEWARE ---------------- */
// Secure HTTP headers
app.use(helmet({
  // Allow inline scripts/styles needed by the React SPA in production
  contentSecurityPolicy: false,
}));

// CORS — lock down to CORS_ORIGIN in production, allow all in development
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true;

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

/* ---------------- RATE LIMITING ---------------- */
// Strict rate limit for login attempts only (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Lenient rate limit for all other auth routes (verify, user management)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per window (verify is called on every page load)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/* ---------------- CORE MIDDLEWARE ---------------- */
app.use(express.json({ limit: '10mb' }));

/* ---------------- HEALTH CHECK ---------------- */
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

/* ---------------- API ROUTES ---------------- */
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/pending-documents', pendingDocumentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/agreements', agreementRoutes);

/* ---------------- API 404 HANDLER (must be before SPA catch-all) ---------------- */
app.use('/api', notFound);

/* ---------------- FRONTEND (SPA) (only use when developing) ---------------- */
//const frontendPath = path.join(__dirname, '../frontend/dist');
//app.use(express.static(frontendPath));
//app.get('*', (req, res) => {
//  res.sendFile(path.join(frontendPath, 'index.html'));
//});

/* ---------------- ERROR HANDLING ---------------- */
app.use(errorHandler);

/* ---------------- HTTP SERVER + SOCKET.IO ---------------- */
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Wire WhatsApp events → Socket.io
setupWhatsAppSocket(io);

/* ---------------- STARTUP TASKS ---------------- */
const createDocumentsIfFirstOfMonth = async () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const dayOfWeek = today.getDay();

  const shouldCreate =
    (dayOfMonth === 1 && dayOfWeek !== 0) ||
    (dayOfMonth === 2 && dayOfWeek === 1);

  if (shouldCreate) {
    const previousMonth = getPreviousMonthFormatted();
    try {
      const results = await documentService.createDocumentsForAllClients(previousMonth);
      logger.info(`Created ${results.length} document records for ${previousMonth} on startup`);
    } catch (err) {
      logger.error('Error creating documents on startup:', err);
    }
  }
};

/* ---------------- SERVER BOOT ---------------- */
server.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);

  initializeScheduledTasks()
    .then(() => logger.info('✅ Scheduler initialized'))
    .catch((err) => logger.error('❌ Scheduler initialization failed:', err));

  createDocumentsIfFirstOfMonth();
});

/* ---------------- GRACEFUL SHUTDOWN ---------------- */
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    logger.info('HTTP server closed');
    try { await shutdownWhatsApp(); } catch { /* ignore */ }
    try { await stopBoss(); } catch { /* already stopped */ }
    process.exit(0);
  });

  // Force exit if server hasn't closed within 10 seconds
  setTimeout(() => {
    logger.error('Forced exit after 10s shutdown timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
