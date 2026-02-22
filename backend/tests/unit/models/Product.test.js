const mongoose = require('mongoose');
const Product = require('../../../src/models/Product');

require('../../setup');

describe('Product Model', () => {
  const validProduct = {
    name: 'Test Product',
    sku: 'TEST-001',
    category: 'beverages',
    brand: 'TestBrand',
    description: 'A test product',
    price: 29.99,
    costPrice: 15.00,
    unit: 'piece',
    stock: 100,
    minStock: 10
  };

  describe('Validation', () => {
    it('should create a valid product', async () => {
      const product = await Product.create(validProduct);
      expect(product._id).toBeDefined();
      expect(product.name).toBe(validProduct.name);
      expect(product.sku).toBe(validProduct.sku);
      expect(product.isActive).toBe(true);
    });

    it('should require name', async () => {
      const product = new Product({ ...validProduct, name: undefined });
      const err = product.validateSync();
      expect(err.errors.name).toBeDefined();
    });

    it('should require sku', async () => {
      const product = new Product({ ...validProduct, sku: undefined });
      const err = product.validateSync();
      expect(err.errors.sku).toBeDefined();
    });

    it('should require price', async () => {
      const product = new Product({ ...validProduct, price: undefined });
      const err = product.validateSync();
      expect(err.errors.price).toBeDefined();
    });

    it('should reject negative price', async () => {
      const product = new Product({ ...validProduct, price: -5 });
      const err = product.validateSync();
      expect(err.errors.price).toBeDefined();
    });

    it('should reject negative stock', async () => {
      const product = new Product({ ...validProduct, stock: -1 });
      const err = product.validateSync();
      expect(err.errors.stock).toBeDefined();
    });

    it('should enforce unique SKU', async () => {
      await Product.create(validProduct);
      await expect(Product.create(validProduct)).rejects.toThrow();
    });

    it('should reject invalid category', async () => {
      const product = new Product({ ...validProduct, category: 'invalid' });
      const err = product.validateSync();
      expect(err.errors.category).toBeDefined();
    });

    it('should reject invalid unit', async () => {
      const product = new Product({ ...validProduct, unit: 'gallon' });
      const err = product.validateSync();
      expect(err.errors.unit).toBeDefined();
    });
  });

  describe('Virtuals', () => {
    it('should compute margin virtual', async () => {
      const product = await Product.create(validProduct);
      const margin = ((validProduct.price - validProduct.costPrice) / validProduct.price) * 100;
      expect(product.margin).toBeCloseTo(margin, 1);
    });
  });

  describe('Defaults', () => {
    it('should default stock to 0 when not provided', async () => {
      const { stock, ...noStock } = validProduct;
      noStock.sku = 'TEST-002';
      const product = await Product.create(noStock);
      expect(product.stock).toBe(0);
    });

    it('should default isActive to true', async () => {
      const product = await Product.create({ ...validProduct, sku: 'TEST-003' });
      expect(product.isActive).toBe(true);
    });
  });
});
