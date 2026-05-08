require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const app = require('./app');
const { connectDB } = require('./db');
const PORT = process.env.PORT || 5000;
/* ===========================================
   MONGODB CONNECTION + SERVER START
=========================================== */
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
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
