const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect, authorize } = require('../../../src/middleware/auth.middleware');
const User = require('../../../src/models/User');

require('../../setup');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Middleware', () => {
  let adminUser;
  const JWT_SECRET = 'test-middleware-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(async () => {
    adminUser = await User.create({
      name: 'Admin', email: 'admin@test.com', password: 'password123', role: 'admin'
    });
  });

  describe('protect', () => {
    it('should reject requests without token', async () => {
      const req = { headers: {} };
      const res = mockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const req = { headers: { authorization: 'Bearer invalidtoken' } };
      const res = mockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const token = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: '0s' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      const next = jest.fn();

      // Small delay to ensure expiry
      await new Promise(resolve => setTimeout(resolve, 100));
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to request with valid token', async () => {
      const token = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: '1h' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(adminUser._id.toString());
    });

    it('should reject token for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const token = jwt.sign({ id: fakeId }, JWT_SECRET, { expiresIn: '1h' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for inactive user', async () => {
      adminUser.isActive = false;
      await adminUser.save();
      const token = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: '1h' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow authorized role', () => {
      const req = { user: { role: 'admin' } };
      const res = mockRes();
      const next = jest.fn();

      authorize('admin', 'distributor')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject unauthorized role', () => {
      const req = { user: { role: 'sales_rep' } };
      const res = mockRes();
      const next = jest.fn();

      authorize('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow any role in the list', () => {
      const req = { user: { role: 'distributor' } };
      const res = mockRes();
      const next = jest.fn();

      authorize('admin', 'distributor', 'sales_rep')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
