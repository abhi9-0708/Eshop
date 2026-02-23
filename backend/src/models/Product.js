const { getDb } = require('../config/database');
const crypto = require('crypto');

function formatProduct(row) {
  if (!row) return null;
  return {
    _id: row._id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    category: row.category,
    brand: row.brand,
    price: row.price,
    costPrice: row.costPrice,
    unit: row.unit,
    unitsPerCase: row.unitsPerCase,
    stock: row.stock,
    minOrderQuantity: row.minOrderQuantity,
    maxOrderQuantity: row.maxOrderQuantity,
    isActive: Boolean(row.isActive),
    images: typeof row.images === 'string' ? JSON.parse(row.images || '[]') : (row.images || []),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
    weight: row.weight,
    dimensions: { length: row.dimLength, width: row.dimWidth, height: row.dimHeight },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    get margin() {
      if (this.price && this.costPrice) {
        return ((this.price - this.costPrice) / this.price * 100).toFixed(2);
      }
      return 0;
    }
  };
}

const Product = {
  async findById(id) {
    const pool = getDb();
    const { rows } = await pool.query('SELECT * FROM products WHERE _id = $1', [id]);
    return formatProduct(rows[0]);
  },

  async findAll({ where = '1=1', params = [], orderBy = '"createdAt" DESC', limit = 20, offset = 0 } = {}) {
    const pool = getDb();
    const paramCount = params.length;
    const sql = `SELECT * FROM products WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    const { rows } = await pool.query(sql, [...params, limit, offset]);
    return rows.map(formatProduct);
  },

  async create(data) {
    const pool = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO products (_id, name, sku, description, category, brand, price, "costPrice", unit, "unitsPerCase", stock, "minOrderQuantity", "maxOrderQuantity", "isActive", images, tags, weight, "dimLength", "dimWidth", "dimHeight", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [id, data.name, (data.sku || '').toUpperCase(), data.description || null, data.category,
       data.brand || null, data.price, data.costPrice || 0,
       data.unit || 'piece', data.unitsPerCase || 1, data.stock || 0,
       data.minOrderQuantity || 1, data.maxOrderQuantity || 10000,
       data.isActive !== false,
       JSON.stringify(data.images || []), JSON.stringify(data.tags || []),
       data.weight || 0, data.dimensions?.length || 0, data.dimensions?.width || 0, data.dimensions?.height || 0,
       now, now]
    );
    return Product.findById(id);
  },

  async update(id, data) {
    const pool = getDb();
    const sets = [];
    const values = [];
    let paramIdx = 1;
    const allowed = ['name', 'description', 'category', 'brand', 'price', 'costPrice', 'unit', 'unitsPerCase', 'stock', 'minOrderQuantity', 'maxOrderQuantity', 'isActive', 'weight'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        const col = ['costPrice', 'unitsPerCase', 'minOrderQuantity', 'maxOrderQuantity', 'isActive'].includes(key) ? `"${key}"` : key;
        sets.push(`${col} = $${paramIdx++}`);
        values.push(key === 'isActive' ? Boolean(data[key]) : data[key]);
      }
    }
    if (data.images) { sets.push(`images = $${paramIdx++}`); values.push(JSON.stringify(data.images)); }
    if (data.tags) { sets.push(`tags = $${paramIdx++}`); values.push(JSON.stringify(data.tags)); }
    if (data.dimensions) {
      if (data.dimensions.length !== undefined) { sets.push(`"dimLength" = $${paramIdx++}`); values.push(data.dimensions.length); }
      if (data.dimensions.width !== undefined) { sets.push(`"dimWidth" = $${paramIdx++}`); values.push(data.dimensions.width); }
      if (data.dimensions.height !== undefined) { sets.push(`"dimHeight" = $${paramIdx++}`); values.push(data.dimensions.height); }
    }
    if (sets.length === 0) return Product.findById(id);
    sets.push(`"updatedAt" = $${paramIdx++}`);
    values.push(new Date().toISOString());
    values.push(id);
    await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE _id = $${paramIdx}`, values);
    return Product.findById(id);
  },

  async delete(id) {
    const pool = getDb();
    await pool.query('DELETE FROM products WHERE _id = $1', [id]);
  },

  async count(where = '1=1', params = []) {
    const pool = getDb();
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM products WHERE ${where}`, params);
    return parseInt(rows[0].count);
  },

  async distinct(column, where = '1=1', params = []) {
    const pool = getDb();
    const { rows } = await pool.query(`SELECT DISTINCT ${column} FROM products WHERE ${where} ORDER BY ${column}`, params);
    return rows.map(r => r[column]);
  },

  async insertMany(items) {
    const pool = getDb();
    const now = new Date().toISOString();
    const results = [];
    for (const d of items) {
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO products (_id, name, sku, description, category, brand, price, "costPrice", unit, "unitsPerCase", stock, "minOrderQuantity", "maxOrderQuantity", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, $15)`,
        [id, d.name, (d.sku || '').toUpperCase(), d.description || null, d.category, d.brand || null, d.price, d.costPrice || 0, d.unit || 'piece', d.unitsPerCase || 1, d.stock || 0, d.minOrderQuantity || 1, d.maxOrderQuantity || 10000, now, now]
      );
      results.push({ _id: id, ...d });
    }
    return results;
  }
};

module.exports = Product;
