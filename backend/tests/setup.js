const { connectDB, closeDB, getDb } = require('../src/config/database');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

afterEach(async () => {
  // Clean test data if needed
  try {
    const pool = getDb();
    await pool.query('DELETE FROM order_status_history');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM visits');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM retailers');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM users');
  } catch (e) {
    // ignore if tables don't exist yet
  }
});
