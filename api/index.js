const dotenv = require('dotenv');
const path = require('path');

// Load env from backend directory
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const app = require('../backend/src/app');
const { connectDB } = require('../backend/src/config/database');
const seedDatabase = require('../backend/src/seeds/seed');

let isInitialized = false;

const initialize = async () => {
  if (!isInitialized) {
    await connectDB();
    await seedDatabase();
    isInitialized = true;
  }
};

// Vercel serverless handler
module.exports = async (req, res) => {
  await initialize();
  return app(req, res);
};
