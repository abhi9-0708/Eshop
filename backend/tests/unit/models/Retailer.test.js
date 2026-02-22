const mongoose = require('mongoose');
const Retailer = require('../../../src/models/Retailer');
const User = require('../../../src/models/User');

require('../../setup');

describe('Retailer Model', () => {
  let salesRep;

  beforeEach(async () => {
    salesRep = await User.create({
      name: 'Sales Rep', email: 'rep@test.com', password: 'password123', role: 'sales_rep'
    });
  });

  const getValidRetailer = (overrides = {}) => ({
    name: 'Test Retailer',
    ownerName: 'Owner Name',
    phone: '1234567890',
    email: 'retailer@test.com',
    address: { street: '123 Main St', city: 'Testville', state: 'TS', zipCode: '12345' },
    category: 'grocery',
    tier: 'silver',
    assignedTo: salesRep._id,
    creditLimit: 5000,
    ...overrides
  });

  describe('Validation', () => {
    it('should create a valid retailer', async () => {
      const retailer = await Retailer.create(getValidRetailer());
      expect(retailer._id).toBeDefined();
      expect(retailer.name).toBe('Test Retailer');
      expect(retailer.status).toBe('active');
    });

    it('should require name', async () => {
      const retailer = new Retailer(getValidRetailer({ name: undefined }));
      const err = retailer.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should require phone', async () => {
      const retailer = new Retailer(getValidRetailer({ phone: undefined }));
      const err = retailer.validateSync();
      expect(err.errors.phone).toBeDefined();
    });

    it('should reject invalid category', async () => {
      const retailer = new Retailer(getValidRetailer({ category: 'invalid' }));
      const err = retailer.validateSync();
      expect(err.errors.category).toBeDefined();
    });

    it('should reject invalid tier', async () => {
      const retailer = new Retailer(getValidRetailer({ tier: 'diamond' }));
      const err = retailer.validateSync();
      expect(err.errors.tier).toBeDefined();
    });

    it('should reject negative credit limit', async () => {
      const retailer = new Retailer(getValidRetailer({ creditLimit: -100 }));
      const err = retailer.validateSync();
      expect(err.errors.creditLimit).toBeDefined();
    });
  });

  describe('Defaults', () => {
    it('should default status to active', async () => {
      const retailer = await Retailer.create(getValidRetailer());
      expect(retailer.status).toBe('active');
    });

    it('should default outstandingBalance to 0', async () => {
      const retailer = await Retailer.create(getValidRetailer());
      expect(retailer.outstandingBalance).toBe(0);
    });

    it('should default totalOrders to 0', async () => {
      const retailer = await Retailer.create(getValidRetailer());
      expect(retailer.totalOrders).toBe(0);
    });
  });

  describe('Valid Enums', () => {
    const categories = ['grocery', 'pharmacy', 'electronics', 'clothing', 'restaurant', 'convenience', 'wholesale'];
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const statuses = ['active', 'inactive', 'suspended'];

    it.each(categories)('should accept category: %s', async (category) => {
      const retailer = new Retailer(getValidRetailer({ category }));
      const err = retailer.validateSync();
      expect(err?.errors?.category).toBeUndefined();
    });

    it.each(tiers)('should accept tier: %s', async (tier) => {
      const retailer = new Retailer(getValidRetailer({ tier }));
      const err = retailer.validateSync();
      expect(err?.errors?.tier).toBeUndefined();
    });

    it.each(statuses)('should accept status: %s', async (status) => {
      const retailer = new Retailer(getValidRetailer({ status }));
      const err = retailer.validateSync();
      expect(err?.errors?.status).toBeUndefined();
    });
  });
});
