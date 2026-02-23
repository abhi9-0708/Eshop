const Product = require('../models/Product');

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, sort = '-createdAt', active } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIdx++} OR sku ILIKE $${paramIdx++} OR brand ILIKE $${paramIdx++})`);
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }
    if (active !== undefined) {
      conditions.push(`"isActive" = $${paramIdx++}`);
      params.push(active === 'true' || active === '1');
    }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';
    let orderBy = '"createdAt" DESC';
    if (sort) {
      const desc = sort.startsWith('-');
      const field = sort.replace(/^-/, '');
      orderBy = `"${field}" ${desc ? 'DESC' : 'ASC'}`;
    }

    const products = await Product.findAll({ where, params, orderBy, limit: limitNum, offset });
    const total = await Product.count(where, params);

    res.json({
      success: true,
      data: products,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
    }
    next(error);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = await Product.update(req.params.id, req.body);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await Product.delete(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category', '"isActive" = true');
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id/stock
const updateStock = async (req, res, next) => {
  try {
    const { quantity, operation } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let newStock = product.stock;
    if (operation === 'add') {
      newStock += quantity;
    } else if (operation === 'subtract') {
      newStock -= quantity;
      if (newStock < 0) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
    } else {
      newStock = quantity;
    }

    const updated = await Product.update(req.params.id, { stock: newStock });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories, updateStock };
