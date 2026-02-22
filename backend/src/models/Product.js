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
    images: JSON.parse(row.images || '[]'),
    tags: JSON.parse(row.tags || '[]'),
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
  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM products WHERE _id = ?').get(id);
    return formatProduct(row);
  },

  findAll({ where = '1=1', params = [], orderBy = 'createdAt DESC', limit = 20, offset = 0 } = {}) {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return rows.map(formatProduct);
  },

  create(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO products (_id, name, sku, description, category, brand, price, costPrice, unit, unitsPerCase, stock, minOrderQuantity, maxOrderQuantity, isActive, images, tags, weight, dimLength, dimWidth, dimHeight, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.name, (data.sku || '').toUpperCase(), data.description || null, data.category,
      data.brand || null, data.price, data.costPrice || 0,
      data.unit || 'piece', data.unitsPerCase || 1, data.stock || 0,
      data.minOrderQuantity || 1, data.maxOrderQuantity || 10000,
      data.isActive !== false ? 1 : 0,
      JSON.stringify(data.images || []), JSON.stringify(data.tags || []),
      data.weight || 0, data.dimensions?.length || 0, data.dimensions?.width || 0, data.dimensions?.height || 0,
      now, now
    );
    return Product.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const sets = [];
    const values = [];
    const allowed = ['name', 'description', 'category', 'brand', 'price', 'costPrice', 'unit', 'unitsPerCase', 'stock', 'minOrderQuantity', 'maxOrderQuantity', 'isActive', 'weight'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(key === 'isActive' ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (data.images) { sets.push('images = ?'); values.push(JSON.stringify(data.images)); }
    if (data.tags) { sets.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.dimensions) {
      if (data.dimensions.length !== undefined) { sets.push('dimLength = ?'); values.push(data.dimensions.length); }
      if (data.dimensions.width !== undefined) { sets.push('dimWidth = ?'); values.push(data.dimensions.width); }
      if (data.dimensions.height !== undefined) { sets.push('dimHeight = ?'); values.push(data.dimensions.height); }
    }
    if (sets.length === 0) return Product.findById(id);
    sets.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE _id = ?`).run(...values);
    return Product.findById(id);
  },

  delete(id) {
    const db = getDb();
    db.prepare('DELETE FROM products WHERE _id = ?').run(id);
  },

  count(where = '1=1', params = []) {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM products WHERE ${where}`).get(...params);
    return row.count;
  },

  distinct(column, where = '1=1', params = []) {
    const db = getDb();
    const rows = db.prepare(`SELECT DISTINCT ${column} FROM products WHERE ${where} ORDER BY ${column}`).all(...params);
    return rows.map(r => r[column]);
  },

  insertMany(items) {
    const db = getDb();
    const insert = db.prepare(`INSERT INTO products (_id, name, sku, description, category, brand, price, costPrice, unit, unitsPerCase, stock, minOrderQuantity, maxOrderQuantity, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`);
    const now = new Date().toISOString();
    const tx = db.transaction((items) => {
      const results = [];
      for (const d of items) {
        const id = crypto.randomUUID();
        insert.run(id, d.name, (d.sku || '').toUpperCase(), d.description || null, d.category, d.brand || null, d.price, d.costPrice || 0, d.unit || 'piece', d.unitsPerCase || 1, d.stock || 0, d.minOrderQuantity || 1, d.maxOrderQuantity || 10000, now, now);
        results.push({ _id: id, ...d });
      }
      return results;
    });
    return tx(items);
  }
};

module.exports = Product;
