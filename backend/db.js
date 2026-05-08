const mongoose = require('mongoose');
const logger = require('./utils/logger');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    throw err;
  }
};

module.exports = { connectDB };
