const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Product = require('../../../src/models/Product');

require('../../setup');

describe('Products API', () => {
  let adminToken, repToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.JWT_EXPIRE = '7d';
  });

  beforeEach(async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
    const rep = await User.create({ name: 'Rep', email: 'rep@test.com', password: 'password123', role: 'sales_rep' });
    adminToken = admin.generateToken();
    repToken = rep.generateToken();
  });

  const sampleProduct = {
    name: 'Test Product',
    sku: 'TEST-001',
    category: 'beverages',
    brand: 'TestBrand',
    price: 29.99,
    costPrice: 15.00,
    unit: 'piece',
    stock: 100
  };

  describe('GET /api/products', () => {
    it('should return products list', async () => {
      await Product.create(sampleProduct);

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
    });

    it('should support search by name', async () => {
      await Product.create(sampleProduct);
      await Product.create({ ...sampleProduct, name: 'Different', sku: 'DIFF-001' });

      const res = await request(app)
        .get('/api/products?search=Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Test Product');
    });

    it('should support filter by category', async () => {
      await Product.create(sampleProduct);
      await Product.create({ ...sampleProduct, sku: 'SNACK-001', category: 'snacks' });

      const res = await request(app)
        .get('/api/products?category=beverages')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.length).toBe(1);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await Product.create({ ...sampleProduct, sku: `TEST-${i}`, name: `Product ${i}` });
      }

      const res = await request(app)
        .get('/api/products?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.length).toBe(5);
      expect(res.body.pagination.total).toBe(15);
      expect(res.body.pagination.pages).toBe(3);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/products', () => {
    it('should create product as admin', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(sampleProduct.name);
      expect(res.body.data.sku).toBe(sampleProduct.sku);
    });

    it('should reject creation by sales_rep', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${repToken}`)
        .send(sampleProduct);

      expect(res.status).toBe(403);
    });

    it('should reject duplicate SKU', async () => {
      await Product.create(sampleProduct);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleProduct);

      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Incomplete Product' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a single product', async () => {
      const product = await Product.create(sampleProduct);

      const res = await request(app)
        .get(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(sampleProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new (require('mongoose').Types.ObjectId)();
      const res = await request(app)
        .get(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product as admin', async () => {
      const product = await Product.create(sampleProduct);

      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Product', price: 39.99 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Product');
      expect(res.body.data.price).toBe(39.99);
    });

    it('should reject update by sales_rep', async () => {
      const product = await Product.create(sampleProduct);

      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({ name: 'Should Fail' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product as admin', async () => {
      const product = await Product.create(sampleProduct);

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const found = await Product.findById(product._id);
      expect(found).toBeNull();
    });

    it('should reject delete by sales_rep', async () => {
      const product = await Product.create(sampleProduct);

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/products/:id/stock', () => {
    it('should update stock', async () => {
      const product = await Product.create(sampleProduct);

      const res = await request(app)
        .patch(`/api/products/${product._id}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stock: 200 });

      expect(res.status).toBe(200);
      expect(res.body.data.stock).toBe(200);
    });
  });
});
