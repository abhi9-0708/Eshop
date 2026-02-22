const User = require('../models/User');
const Product = require('../models/Product');
const Retailer = require('../models/Retailer');
const Order = require('../models/Order');
const { getDb } = require('../config/database');

const seedDatabase = async () => {
  const db = getDb();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  // Create users
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@retailshop.com',
    password: 'password123',
    role: 'admin',
    phone: '555-0100',
    territory: 'All'
  });

  const distributor1 = await User.create({
    name: 'John Distributor',
    email: 'distributor1@retailshop.com',
    password: 'password123',
    role: 'distributor',
    phone: '555-0201',
    territory: 'East Region'
  });

  const distributor2 = await User.create({
    name: 'Jane Distributor',
    email: 'distributor2@retailshop.com',
    password: 'password123',
    role: 'distributor',
    phone: '555-0202',
    territory: 'West Region'
  });

  const salesRep1 = await User.create({
    name: 'Mike Sales',
    email: 'sales1@retailshop.com',
    password: 'password123',
    role: 'sales_rep',
    phone: '555-0301',
    territory: 'Downtown',
    distributor: distributor1._id
  });

  const salesRep2 = await User.create({
    name: 'Sarah Sales',
    email: 'sales2@retailshop.com',
    password: 'password123',
    role: 'sales_rep',
    phone: '555-0302',
    territory: 'Uptown',
    distributor: distributor1._id
  });

  const salesRep3 = await User.create({
    name: 'Tom Sales',
    email: 'sales3@retailshop.com',
    password: 'password123',
    role: 'sales_rep',
    phone: '555-0303',
    territory: 'Suburbs',
    distributor: distributor2._id
  });

  console.log('Users seeded');

  // Create products
  const products = Product.insertMany([
    { name: 'Premium Cola', sku: 'BEV-001', description: 'Refreshing cola drink', category: 'Beverages', brand: 'FreshDrink', price: 24.99, costPrice: 18.00, unit: 'case', unitsPerCase: 24, stock: 500, minOrderQuantity: 5 },
    { name: 'Spring Water 500ml', sku: 'BEV-002', description: 'Natural spring water', category: 'Beverages', brand: 'PureSpring', price: 12.99, costPrice: 8.00, unit: 'case', unitsPerCase: 24, stock: 1000, minOrderQuantity: 10 },
    { name: 'Orange Juice 1L', sku: 'BEV-003', description: 'Fresh squeezed OJ', category: 'Beverages', brand: 'FreshDrink', price: 36.99, costPrice: 28.00, unit: 'case', unitsPerCase: 12, stock: 300, minOrderQuantity: 3 },
    { name: 'Potato Chips Original', sku: 'SNK-001', description: 'Classic potato chips', category: 'Snacks', brand: 'CrunchTime', price: 18.99, costPrice: 12.00, unit: 'box', unitsPerCase: 48, stock: 400, minOrderQuantity: 5 },
    { name: 'Chocolate Bar', sku: 'SNK-002', description: 'Milk chocolate bar', category: 'Snacks', brand: 'SweetTooth', price: 28.99, costPrice: 20.00, unit: 'box', unitsPerCase: 36, stock: 350, minOrderQuantity: 3 },
    { name: 'Organic Granola', sku: 'SNK-003', description: 'Organic honey granola', category: 'Snacks', brand: 'NatureGood', price: 42.99, costPrice: 32.00, unit: 'case', unitsPerCase: 12, stock: 200, minOrderQuantity: 2 },
    { name: 'All-Purpose Cleaner', sku: 'CLN-001', description: 'Multi-surface cleaner', category: 'Household', brand: 'CleanPro', price: 15.99, costPrice: 9.50, unit: 'case', unitsPerCase: 12, stock: 600, minOrderQuantity: 5 },
    { name: 'Laundry Detergent', sku: 'CLN-002', description: 'Liquid laundry detergent', category: 'Household', brand: 'CleanPro', price: 22.99, costPrice: 15.00, unit: 'case', unitsPerCase: 6, stock: 450, minOrderQuantity: 3 },
    { name: 'Paper Towels', sku: 'CLN-003', description: '2-ply paper towels', category: 'Household', brand: 'SoftTouch', price: 19.99, costPrice: 13.00, unit: 'pack', unitsPerCase: 12, stock: 800, minOrderQuantity: 5 },
    { name: 'White Rice 5kg', sku: 'GRC-001', description: 'Premium long grain rice', category: 'Grocery', brand: 'GoldenGrain', price: 8.99, costPrice: 5.50, unit: 'piece', stock: 1000, minOrderQuantity: 10 },
    { name: 'Pasta Spaghetti', sku: 'GRC-002', description: 'Italian spaghetti', category: 'Grocery', brand: 'Italiano', price: 14.99, costPrice: 9.00, unit: 'case', unitsPerCase: 20, stock: 500, minOrderQuantity: 5 },
    { name: 'Olive Oil 1L', sku: 'GRC-003', description: 'Extra virgin olive oil', category: 'Grocery', brand: 'Italiano', price: 48.99, costPrice: 35.00, unit: 'case', unitsPerCase: 6, stock: 200, minOrderQuantity: 2 },
    { name: 'Shampoo 500ml', sku: 'PRS-001', description: 'Daily care shampoo', category: 'Personal Care', brand: 'FreshLook', price: 32.99, costPrice: 22.00, unit: 'case', unitsPerCase: 12, stock: 350, minOrderQuantity: 3 },
    { name: 'Hand Soap', sku: 'PRS-002', description: 'Antibacterial soap', category: 'Personal Care', brand: 'CleanHands', price: 16.99, costPrice: 10.00, unit: 'case', unitsPerCase: 24, stock: 500, minOrderQuantity: 5 },
    { name: 'Toothpaste', sku: 'PRS-003', description: 'Whitening toothpaste', category: 'Personal Care', brand: 'BrightSmile', price: 21.99, costPrice: 14.00, unit: 'case', unitsPerCase: 24, stock: 600, minOrderQuantity: 5 }
  ]);
  console.log('Products seeded');

  // Create retailers
  const retailers = Retailer.insertMany([
    { name: 'SuperMart Downtown', ownerName: 'Bob Wilson', email: 'bob@supermart.com', phone: '555-1001', address: { street: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001' }, category: 'grocery', tier: 'gold', assignedTo: salesRep1._id, distributor: distributor1._id, creditLimit: 10000 },
    { name: 'QuickStop Express', ownerName: 'Alice Johnson', email: 'alice@quickstop.com', phone: '555-1002', address: { street: '456 Oak Ave', city: 'New York', state: 'NY', zipCode: '10002' }, category: 'general', tier: 'silver', assignedTo: salesRep1._id, distributor: distributor1._id, creditLimit: 5000 },
    { name: 'FreshDaily Market', ownerName: 'Charlie Brown', email: 'charlie@freshdaily.com', phone: '555-1003', address: { street: '789 Pine Rd', city: 'Brooklyn', state: 'NY', zipCode: '11201' }, category: 'grocery', tier: 'platinum', assignedTo: salesRep2._id, distributor: distributor1._id, creditLimit: 15000 },
    { name: 'City Pharmacy', ownerName: 'Diana Prince', email: 'diana@citypharm.com', phone: '555-1004', address: { street: '321 Elm St', city: 'Queens', state: 'NY', zipCode: '11101' }, category: 'pharmacy', tier: 'gold', assignedTo: salesRep2._id, distributor: distributor1._id, creditLimit: 8000 },
    { name: 'WestSide General', ownerName: 'Eve Martinez', email: 'eve@westside.com', phone: '555-1005', address: { street: '654 Cedar Ln', city: 'Los Angeles', state: 'CA', zipCode: '90001' }, category: 'general', tier: 'silver', assignedTo: salesRep3._id, distributor: distributor2._id, creditLimit: 6000 },
    { name: 'Pacific Wholesale', ownerName: 'Frank Lee', email: 'frank@pacific.com', phone: '555-1006', address: { street: '987 Birch Dr', city: 'San Francisco', state: 'CA', zipCode: '94101' }, category: 'wholesale', tier: 'gold', assignedTo: salesRep3._id, distributor: distributor2._id, creditLimit: 20000 },
    { name: 'Valley Electronics', ownerName: 'Grace Kim', email: 'grace@valleyelec.com', phone: '555-1007', address: { street: '147 Maple Way', city: 'San Jose', state: 'CA', zipCode: '95101' }, category: 'electronics', tier: 'bronze', assignedTo: salesRep3._id, distributor: distributor2._id, creditLimit: 3000 }
  ]);
  console.log('Retailers seeded');

  // Create some orders
  const now = new Date().toISOString();
  const createOrderData = (retailerIdx, items, status) => {
    const r = retailers[retailerIdx];
    const distId = typeof r.distributor === 'object' ? r.distributor._id : r.distributor;
    const repId = typeof r.assignedTo === 'object' ? r.assignedTo._id : r.assignedTo;
    let subtotal = 0;
    const orderItems = items.map(i => {
      const p = products[i.idx];
      const lineTotal = p.price * i.qty;
      subtotal += lineTotal;
      return { product: p._id, productName: p.name, sku: p.sku, quantity: i.qty, unitPrice: p.price, discount: 0, lineTotal };
    });
    const taxAmount = subtotal * 0.08;
    return {
      retailer: r._id, distributor: distId, salesRep: repId,
      items: orderItems, subtotal, taxRate: 8, taxAmount, discountAmount: 0, totalAmount: subtotal + taxAmount,
      status, paymentStatus: status === 'delivered' ? 'paid' : 'unpaid', paymentMethod: 'cash',
      statusHistory: [{ status: 'pending', changedBy: repId, changedAt: now, notes: 'Order created' }]
    };
  };

  Order.create(createOrderData(0, [{ idx: 0, qty: 10 }, { idx: 3, qty: 5 }], 'delivered'));
  Order.create(createOrderData(1, [{ idx: 1, qty: 20 }, { idx: 6, qty: 10 }], 'processing'));
  Order.create(createOrderData(2, [{ idx: 2, qty: 5 }, { idx: 4, qty: 8 }, { idx: 9, qty: 15 }], 'pending'));

  console.log('Orders seeded');
  console.log('Database seeding completed!');
};

module.exports = seedDatabase;
