const { Pool } = require('pg');

let pool = null;

const getDb = () => {
  if (!pool) throw new Error('Database not initialized. Call connectDB() first.');
  return pool;
};

const connectDB = async () => {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // Test connection
    const client = await pool.connect();
    console.log('PostgreSQL Connected');
    client.release();

    await createTables();
    return pool;
  } catch (error) {
    console.error(`PostgreSQL Connection Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'sales_rep' CHECK(role IN ('admin','distributor','sales_rep')),
      phone TEXT,
      territory TEXT,
      distributor TEXT REFERENCES users(_id) ON DELETE SET NULL,
      "isActive" BOOLEAN DEFAULT true,
      "lastLogin" TEXT,
      avatar TEXT,
      "createdAt" TEXT DEFAULT (NOW()::text),
      "updatedAt" TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS products (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      description TEXT,
      category TEXT NOT NULL,
      brand TEXT,
      price REAL NOT NULL CHECK(price >= 0),
      "costPrice" REAL DEFAULT 0,
      unit TEXT DEFAULT 'piece' CHECK(unit IN ('piece','box','case','kg','liter','pack')),
      "unitsPerCase" INTEGER DEFAULT 1,
      stock INTEGER DEFAULT 0,
      "minOrderQuantity" INTEGER DEFAULT 1,
      "maxOrderQuantity" INTEGER DEFAULT 10000,
      "isActive" BOOLEAN DEFAULT true,
      images TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      weight REAL DEFAULT 0,
      "dimLength" REAL DEFAULT 0,
      "dimWidth" REAL DEFAULT 0,
      "dimHeight" REAL DEFAULT 0,
      "createdAt" TEXT DEFAULT (NOW()::text),
      "updatedAt" TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS retailers (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "ownerName" TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      "addressStreet" TEXT,
      "addressCity" TEXT NOT NULL,
      "addressState" TEXT NOT NULL,
      "addressZipCode" TEXT,
      "addressCountry" TEXT DEFAULT 'US',
      "locationLat" REAL DEFAULT 0,
      "locationLng" REAL DEFAULT 0,
      category TEXT DEFAULT 'general' CHECK(category IN ('grocery','pharmacy','electronics','clothing','general','wholesale','other')),
      tier TEXT DEFAULT 'bronze' CHECK(tier IN ('platinum','gold','silver','bronze')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
      "assignedTo" TEXT NOT NULL REFERENCES users(_id),
      distributor TEXT NOT NULL REFERENCES users(_id),
      "creditLimit" REAL DEFAULT 5000,
      "outstandingBalance" REAL DEFAULT 0,
      "totalOrders" INTEGER DEFAULT 0,
      "lastOrderDate" TEXT,
      notes TEXT,
      tags TEXT DEFAULT '[]',
      "createdAt" TEXT DEFAULT (NOW()::text),
      "updatedAt" TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS orders (
      _id TEXT PRIMARY KEY,
      "orderNumber" TEXT NOT NULL UNIQUE,
      retailer TEXT NOT NULL REFERENCES retailers(_id),
      distributor TEXT NOT NULL REFERENCES users(_id),
      "salesRep" TEXT NOT NULL REFERENCES users(_id),
      subtotal REAL NOT NULL DEFAULT 0,
      "taxRate" REAL DEFAULT 0,
      "taxAmount" REAL DEFAULT 0,
      "discountAmount" REAL DEFAULT 0,
      "totalAmount" REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
      "paymentStatus" TEXT DEFAULT 'unpaid' CHECK("paymentStatus" IN ('unpaid','partial','paid')),
      "paymentMethod" TEXT DEFAULT 'cash' CHECK("paymentMethod" IN ('cash','credit','bank_transfer','check')),
      notes TEXT,
      "deliveryDate" TEXT,
      "deliveryStreet" TEXT,
      "deliveryCity" TEXT,
      "deliveryState" TEXT,
      "deliveryZipCode" TEXT,
      "createdAt" TEXT DEFAULT (NOW()::text),
      "updatedAt" TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES orders(_id) ON DELETE CASCADE,
      product TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity >= 1),
      "unitPrice" REAL NOT NULL CHECK("unitPrice" >= 0),
      discount REAL DEFAULT 0,
      "lineTotal" REAL NOT NULL CHECK("lineTotal" >= 0)
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES orders(_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      "changedBy" TEXT REFERENCES users(_id),
      "changedAt" TEXT DEFAULT (NOW()::text),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS visits (
      _id TEXT PRIMARY KEY,
      retailer TEXT NOT NULL REFERENCES retailers(_id),
      "salesRep" TEXT NOT NULL REFERENCES users(_id),
      "visitDate" TEXT NOT NULL DEFAULT (NOW()::text),
      "checkInTime" TEXT,
      "checkOutTime" TEXT,
      purpose TEXT NOT NULL CHECK(purpose IN ('sales','collection','merchandising','complaint','follow_up','new_business')),
      outcome TEXT DEFAULT 'no_order' CHECK(outcome IN ('order_placed','follow_up_needed','no_order','resolved','escalated')),
      notes TEXT,
      "orderCreated" TEXT REFERENCES orders(_id),
      "locationLat" REAL DEFAULT 0,
      "locationLng" REAL DEFAULT 0,
      "createdAt" TEXT DEFAULT (NOW()::text),
      "updatedAt" TEXT DEFAULT (NOW()::text)
    );
  `);

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, "isActive")',
    'CREATE INDEX IF NOT EXISTS idx_retailers_assignedTo ON retailers("assignedTo", status)',
    'CREATE INDEX IF NOT EXISTS idx_retailers_distributor ON retailers(distributor)',
    'CREATE INDEX IF NOT EXISTS idx_orders_retailer ON orders(retailer, "createdAt")',
    'CREATE INDEX IF NOT EXISTS idx_orders_distributor ON orders(distributor, status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_salesRep ON orders("salesRep", "createdAt")',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items("orderId")',
    'CREATE INDEX IF NOT EXISTS idx_order_status_history_orderId ON order_status_history("orderId")',
    'CREATE INDEX IF NOT EXISTS idx_visits_salesRep ON visits("salesRep", "visitDate")',
    'CREATE INDEX IF NOT EXISTS idx_visits_retailer ON visits(retailer, "visitDate")'
  ];
  for (const idx of indexes) {
    await pool.query(idx);
  }
}

const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = { connectDB, getDb, closeDB };
