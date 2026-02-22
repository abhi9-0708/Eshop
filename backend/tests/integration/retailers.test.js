const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Retailer = require('../../../src/models/Retailer');

require('../../setup');

describe('Retailers API', () => {
  let admin, distributor, salesRep, adminToken, distToken, repToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.JWT_EXPIRE = '7d';
  });

  beforeEach(async () => {
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
    distributor = await User.create({ name: 'Distributor', email: 'dist@test.com', password: 'password123', role: 'distributor' });
    salesRep = await User.create({ name: 'Rep', email: 'rep@test.com', password: 'password123', role: 'sales_rep', distributor: distributor._id });
    adminToken = admin.generateToken();
    distToken = distributor.generateToken();
    repToken = salesRep.generateToken();
  });

  const getRetailerData = (assignedTo) => ({
    name: 'Test Store',
    ownerName: 'John Owner',
    phone: '1234567890',
    email: 'store@test.com',
    address: { street: '123 Main St', city: 'Testville', state: 'TS', zipCode: '12345' },
    category: 'grocery',
    tier: 'silver',
    assignedTo: assignedTo?.toString(),
    creditLimit: 5000
  });

  describe('GET /api/retailers', () => {
    it('should return all retailers for admin', async () => {
      await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .get('/api/retailers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should filter retailers for distributor', async () => {
      await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .get('/api/retailers')
        .set('Authorization', `Bearer ${distToken}`);

      expect(res.status).toBe(200);
    });

    it('should support search', async () => {
      await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .get('/api/retailers?search=Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/retailers');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/retailers', () => {
    it('should create retailer as admin', async () => {
      const data = getRetailerData(salesRep._id);
      const res = await request(app)
        .post('/api/retailers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Store');
    });

    it('should auto-assign when created by sales_rep', async () => {
      const data = getRetailerData();
      const res = await request(app)
        .post('/api/retailers')
        .set('Authorization', `Bearer ${repToken}`)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.data.assignedTo.toString()).toBe(salesRep._id.toString());
    });

    it('should reject missing name', async () => {
      const data = getRetailerData(salesRep._id);
      delete data.name;

      const res = await request(app)
        .post('/api/retailers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(data);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/retailers/:id', () => {
    it('should return single retailer', async () => {
      const retailer = await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .get(`/api/retailers/${retailer._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Test Store');
    });

    it('should return 404 for non-existent', async () => {
      const fakeId = new (require('mongoose').Types.ObjectId)();
      const res = await request(app)
        .get(`/api/retailers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/retailers/:id', () => {
    it('should update retailer', async () => {
      const retailer = await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .put(`/api/retailers/${retailer._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Store', tier: 'gold' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Store');
      expect(res.body.data.tier).toBe('gold');
    });
  });

  describe('DELETE /api/retailers/:id', () => {
    it('should delete retailer as admin', async () => {
      const retailer = await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .delete(`/api/retailers/${retailer._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const found = await Retailer.findById(retailer._id);
      expect(found).toBeNull();
    });

    it('should reject delete by sales_rep', async () => {
      const retailer = await Retailer.create({ ...getRetailerData(salesRep._id), assignedTo: salesRep._id, distributor: distributor._id });

      const res = await request(app)
        .delete(`/api/retailers/${retailer._id}`)
        .set('Authorization', `Bearer ${repToken}`);

      expect(res.status).toBe(403);
    });
  });
});
