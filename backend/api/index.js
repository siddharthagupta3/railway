const app = require('../app');
const { connectDB } = require('../db');

let isConnected = false;

async function ensureDb() {
  if (isConnected) return;
  try {
    await connectDB();
    isConnected = true;
  } catch (err) {
    console.error('Database connection error in serverless function:', err);
    throw err;
  }
}

module.exports = async (req, res) => {
  try {
    await ensureDb();
    // Pass request to express app
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Service temporarily unavailable.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
