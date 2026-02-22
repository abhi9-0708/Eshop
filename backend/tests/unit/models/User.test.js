const mongoose = require('mongoose');
const User = require('../../../src/models/User');

require('../../setup');

describe('User Model', () => {
  const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'admin',
    phone: '1234567890'
  };

  describe('Validation', () => {
    it('should create a valid user', async () => {
      const user = await User.create(validUser);
      expect(user._id).toBeDefined();
      expect(user.name).toBe(validUser.name);
      expect(user.email).toBe(validUser.email);
      expect(user.role).toBe('admin');
      expect(user.isActive).toBe(true);
    });

    it('should require name', async () => {
      const user = new User({ ...validUser, name: undefined });
      const err = user.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should require email', async () => {
      const user = new User({ ...validUser, email: undefined });
      const err = user.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('should require password', async () => {
      const user = new User({ ...validUser, password: undefined });
      const err = user.validateSync();
      expect(err.errors.password).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const user = new User({ ...validUser, email: 'invalid-email' });
      const err = user.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('should reject invalid role', async () => {
      const user = new User({ ...validUser, role: 'superuser' });
      const err = user.validateSync();
      expect(err.errors.role).toBeDefined();
    });

    it('should accept valid roles', async () => {
      for (const role of ['admin', 'distributor', 'sales_rep']) {
        const user = new User({ ...validUser, email: `${role}@test.com`, role });
        const err = user.validateSync();
        expect(err?.errors?.role).toBeUndefined();
      }
    });

    it('should enforce unique email', async () => {
      await User.create(validUser);
      await expect(User.create(validUser)).rejects.toThrow();
    });

    it('should enforce minimum password length', async () => {
      const user = new User({ ...validUser, password: '12345' });
      const err = user.validateSync();
      expect(err.errors.password).toBeDefined();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = await User.create(validUser);
      expect(user.password).not.toBe(validUser.password);
      expect(user.password).toMatch(/^\$2[aby]\$/);
    });

    it('should not rehash if password is not modified', async () => {
      const user = await User.create(validUser);
      const hashedPw = user.password;
      user.name = 'Updated Name';
      await user.save();
      expect(user.password).toBe(hashedPw);
    });
  });

  describe('Instance Methods', () => {
    it('comparePassword should return true for correct password', async () => {
      const user = await User.create(validUser);
      const isMatch = await user.comparePassword(validUser.password);
      expect(isMatch).toBe(true);
    });

    it('comparePassword should return false for wrong password', async () => {
      const user = await User.create(validUser);
      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    it('generateToken should return a JWT string', async () => {
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.JWT_EXPIRE = '7d';
      const user = await User.create(validUser);
      const token = user.generateToken();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('JSON Transform', () => {
    it('should exclude password from JSON output', async () => {
      const user = await User.create(validUser);
      const json = user.toJSON();
      expect(json.password).toBeUndefined();
    });
  });
});
