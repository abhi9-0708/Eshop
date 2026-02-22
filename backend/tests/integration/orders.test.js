const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Product = require('../../../src/models/Product');
const Retailer = require('../../../src/models/Retailer');
const Order = require('../../../src/models/Order');

require('../../setup');

describe('Orders API', () => {
  let admin, distributor, salesRep, adminToken, repToken;
  let product1, product2, retailer;

  beforeAll(() => {
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.JWT_EXPIRE = '7d';
  });

  beforeEach(async () => {
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
    distributor = await User.create({ name: 'Distributor', email: 'dist@test.com', password: 'password123', role: 'distributor' });
    salesRep = await User.create({ name: 'Rep', email: 'rep@test.com', password: 'password123', role: 'sales_rep', distributor: distributor._id });
    adminToken = admin.generateToken();
    repToken = salesRep.generateToken();

    product1 = await Product.create({ name: 'Product A', sku: 'PA-001', category: 'beverages', price: 10, costPrice: 5, unit: 'piece', stock: 100 });
    product2 = await Product.create({ name: 'Product B', sku: 'PB-001', category: 'snacks', price: 20, costPrice: 12, unit: 'piece', stock: 50 });

    retailer = await Retailer.create({
      name: 'Test Retailer', ownerName: 'Owner', phone: '1234567890',
      address: { street: '1 St', city: 'City', state: 'ST', zipCode: '00000' },
      category: 'grocery', tier: 'silver', assignedTo: salesRep._id, distributor: distributor._id, creditLimit: 5000
    });
  });

  const getOrderData = () => ({
    retailer: retailer._id.toString(),
    items: [
      { product: product1._id.toString(), quantity: 5, unitPrice: 10, discount: 0 },
      { product: product2._id.toString(), quantity: 3, unitPrice: 20, discount: 5 }
    ],
    paymentMethod: 'credit',
    notes: 'Test order'
  });

  describe('POST /api/orders', () => {
    it('should create order with valid data', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.status).toBe('pending');
    });

    it('should reduce product stock after order', async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());

      const updatedP1 = await Product.findById(product1._id);
      const updatedP2 = await Product.findById(product2._id);
      expect(updatedP1.stock).toBe(95); // 100 - 5
      expect(updatedP2.stock).toBe(47); // 50 - 3
    });

    it('should update retailer totalOrders', async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());

      const updated = await Retailer.findById(retailer._id);
      expect(updated.totalOrders).toBe(1);
    });

    it('should reject order with insufficient stock', async () => {
      const data = getOrderData();
      data.items[0].quantity = 999;

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(data);

      expect(res.status).toBe(400);
    });

    it('should reject order without items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send({ retailer: retailer._id.toString(), items: [] });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send(getOrderData());

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());
    });

    it('should return orders for admin', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should support status filter', async () => {
      const res = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(order => expect(order.status).toBe('pending'));
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());

      const res = await request(app)
        .get(`/api/orders/${createRes.body.data._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.items).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    let orderId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());
      orderId = createRes.body.data._id;
    });

    it('should update order status (pending -> confirmed)', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should add to status history', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.body.data.statusHistory.length).toBeGreaterThan(0);
    });

    it('should reject invalid status transition', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(400);
    });

    it('should restore stock on cancellation', async () => {
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' });

      const updatedP1 = await Product.findById(product1._id);
      const updatedP2 = await Product.findById(product2._id);
      expect(updatedP1.stock).toBe(100); // restored
      expect(updatedP2.stock).toBe(50);
    });
  });

  describe('PATCH /api/orders/:id/payment', () => {
    it('should update payment status', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${repToken}`)
        .send(getOrderData());

      const res = await request(app)
        .patch(`/api/orders/${createRes.body.data._id}/payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentStatus: 'paid' });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('paid');
    });
  });
});
