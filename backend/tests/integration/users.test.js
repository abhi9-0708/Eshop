const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');

require('../../setup');

describe('Users API (RBAC)', () => {
  let admin, distributor, salesRep, adminToken, distToken, repToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.JWT_EXPIRE = '7d';
  });

  beforeEach(async () => {
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin' });
    distributor = await User.create({ name: 'Distributor', email: 'dist@test.com', password: 'password123', role: 'distributor' });
    salesRep = await User.create({ name: 'Rep', email: 'rep@test.com', password: 'password123', role: 'sales_rep' });
    adminToken = admin.generateToken();
    distToken = distributor.generateToken();
    repToken = salesRep.generateToken();
  });

  describe('Role-Based Access Control', () => {
    it('admin should access user management', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('distributor should be denied user management', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${distToken}`);
      expect(res.status).toBe(403);
    });

    it('sales_rep should be denied user management', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${repToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users', () => {
    it('should return paginated users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/users?role=distributor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(user => expect(user.role).toBe('distributor'));
    });

    it('should search by name', async () => {
      const res = await request(app)
        .get('/api/users?search=Admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const res = await request(app)
        .get(`/api/users/${distributor._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('dist@test.com');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user role', async () => {
      const res = await request(app)
        .put(`/api/users/${salesRep._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'distributor', name: 'Promoted Rep' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('distributor');
      expect(res.body.data.name).toBe('Promoted Rep');
    });

    it('should toggle user active status', async () => {
      const res = await request(app)
        .put(`/api/users/${salesRep._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      const res = await request(app)
        .delete(`/api/users/${salesRep._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const found = await User.findById(salesRep._id);
      expect(found).toBeNull();
    });

    it('should prevent deleting last admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject non-admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${salesRep._id}`)
        .set('Authorization', `Bearer ${distToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/distributors', () => {
    it('should return list of distributors', async () => {
      const res = await request(app)
        .get('/api/users/distributors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/users/sales-reps', () => {
    it('should return list of sales reps', async () => {
      const res = await request(app)
        .get('/api/users/sales-reps')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});
