require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const geminiRoutes = require('./routes/gemini');

const app = express();
const PORT = process.env.PORT || 5000;

/* ════════════════════════════════════════════
   SECURITY MIDDLEWARE
════════════════════════════════════════════ */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS — allow frontend origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow file:// for local dev (when opening HTML directly)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, file://)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked for origin: ${origin}`);
    callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Sanitize MongoDB query injection
app.use(mongoSanitize());

/* ════════════════════════════════════════════
   BODY PARSING
════════════════════════════════════════════ */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ════════════════════════════════════════════
   REQUEST LOGGING (Morgan → Winston)
════════════════════════════════════════════ */
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.url === '/api/health',
  })
);

/* ════════════════════════════════════════════
   GLOBAL RATE LIMIT
════════════════════════════════════════════ */
app.use('/api/', apiLimiter);


/* ════════════════════════════════════════════
   ROUTES
════════════════════════════════════════════ */
// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    uptime: process.uptime().toFixed(2) + 's',
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/gemini', geminiRoutes);

/* ════════════════════════════════════════════
   SERVE FRONTEND (STATIC FILES)
════════════════════════════════════════════ */
// Serve the entire frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// If user hits root, redirect to signup
app.get('/', (req, res) => {
  res.redirect('/signup/signup.html');
});

/* ════════════════════════════════════════════
   404 HANDLER
════════════════════════════════════════════ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

/* ════════════════════════════════════════════
   GLOBAL ERROR HANDLER
════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.stack || err.message}`);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: 'Validation Error', errors });
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already in use.` });
  }
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

/* ════════════════════════════════════════════
   MONGODB CONNECTION + SERVER START
════════════════════════════════════════════ */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔒 CORS origins: ${allowedOrigins.join(', ') || 'ALL (file://)'}`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing server...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

module.exports = app;
