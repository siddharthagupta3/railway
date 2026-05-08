const app = require('../app');
const { connectDB } = require('../db');

let isConnected = false;

async function ensureDb() {
  if (isConnected) return;
  await connectDB();
  isConnected = true;
}

module.exports = async (req, res) => {
  try {
    await ensureDb();
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Database connection failed.',
    });
  }
};
