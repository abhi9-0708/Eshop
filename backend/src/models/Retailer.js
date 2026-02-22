const { getDb } = require('../config/database');
const crypto = require('crypto');

function formatRetailer(row) {
  if (!row) return null;
  const r = {
    _id: row._id,
    name: row.name,
    ownerName: row.ownerName,
    email: row.email,
    phone: row.phone,
    address: {
      street: row.addressStreet,
      city: row.addressCity,
      state: row.addressState,
      zipCode: row.addressZipCode,
      country: row.addressCountry
    },
    location: { type: 'Point', coordinates: [row.locationLng || 0, row.locationLat || 0] },
    category: row.category,
    tier: row.tier,
    status: row.status,
    creditLimit: row.creditLimit,
    outstandingBalance: row.outstandingBalance,
    totalOrders: row.totalOrders,
    lastOrderDate: row.lastOrderDate,
    notes: row.notes,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };

  // Handle populated assignedTo
  if (row.at_id) {
    r.assignedTo = { _id: row.at_id, name: row.at_name, email: row.at_email, phone: row.at_phone };
  } else {
    r.assignedTo = row.assignedTo;
  }

  // Handle populated distributor
  if (row.dist_id) {
    r.distributor = { _id: row.dist_id, name: row.dist_name, email: row.dist_email, phone: row.dist_phone };
  } else {
    r.distributor = row.distributor;
  }

  return r;
}

const POPULATE_JOIN = `
  LEFT JOIN users a ON r.assignedTo = a._id
  LEFT JOIN users d ON r.distributor = d._id
`;
const POPULATE_COLS = `,
  a._id as at_id, a.name as at_name, a.email as at_email, a.phone as at_phone,
  d._id as dist_id, d.name as dist_name, d.email as dist_email, d.phone as dist_phone
`;

const Retailer = {
  findById(id, populate = false) {
    const db = getDb();
    let sql, row;
    if (populate) {
      sql = `SELECT r.* ${POPULATE_COLS} FROM retailers r ${POPULATE_JOIN} WHERE r._id = ?`;
      row = db.prepare(sql).get(id);
    } else {
      row = db.prepare('SELECT * FROM retailers WHERE _id = ?').get(id);
    }
    return formatRetailer(row);
  },

  findAll({ where = '1=1', params = [], orderBy = 'r.createdAt DESC', limit = 20, offset = 0, populate = false } = {}) {
    const db = getDb();
    let sql;
    if (populate) {
      sql = `SELECT r.* ${POPULATE_COLS} FROM retailers r ${POPULATE_JOIN} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    } else {
      sql = `SELECT r.* FROM retailers r WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    }
    const rows = db.prepare(sql).all(...params, limit, offset);
    return rows.map(formatRetailer);
  },

  create(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const addr = data.address || {};
    db.prepare(`INSERT INTO retailers (_id, name, ownerName, email, phone, addressStreet, addressCity, addressState, addressZipCode, addressCountry, category, tier, status, assignedTo, distributor, creditLimit, notes, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.name, data.ownerName, data.email || null, data.phone,
      addr.street || null, addr.city, addr.state, addr.zipCode || null, addr.country || 'US',
      data.category || 'general', data.tier || 'bronze', data.status || 'active',
      data.assignedTo, data.distributor, data.creditLimit || 5000,
      data.notes || null, JSON.stringify(data.tags || []), now, now
    );
    return Retailer.findById(id, true);
  },

  update(id, data) {
    const db = getDb();
    const sets = [];
    const values = [];
    const allowed = ['name', 'ownerName', 'email', 'phone', 'category', 'tier', 'status', 'assignedTo', 'distributor', 'creditLimit', 'outstandingBalance', 'totalOrders', 'lastOrderDate', 'notes'];
    for (const key of allowed) {
      if (data[key] !== undefined) { sets.push(`${key} = ?`); values.push(data[key]); }
    }
    if (data.address) {
      if (data.address.street !== undefined) { sets.push('addressStreet = ?'); values.push(data.address.street); }
      if (data.address.city !== undefined) { sets.push('addressCity = ?'); values.push(data.address.city); }
      if (data.address.state !== undefined) { sets.push('addressState = ?'); values.push(data.address.state); }
      if (data.address.zipCode !== undefined) { sets.push('addressZipCode = ?'); values.push(data.address.zipCode); }
      if (data.address.country !== undefined) { sets.push('addressCountry = ?'); values.push(data.address.country); }
    }
    if (data.tags) { sets.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (sets.length === 0) return Retailer.findById(id, true);
    sets.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE retailers SET ${sets.join(', ')} WHERE _id = ?`).run(...values);
    return Retailer.findById(id, true);
  },

  delete(id) {
    getDb().prepare('DELETE FROM retailers WHERE _id = ?').run(id);
  },

  count(where = '1=1', params = []) {
    const row = getDb().prepare(`SELECT COUNT(*) as count FROM retailers r WHERE ${where}`).get(...params);
    return row.count;
  },

  insertMany(items) {
    const db = getDb();
    const now = new Date().toISOString();
    const insert = db.prepare(`INSERT INTO retailers (_id, name, ownerName, email, phone, addressStreet, addressCity, addressState, addressZipCode, addressCountry, category, tier, status, assignedTo, distributor, creditLimit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`);
    const tx = db.transaction((items) => {
      const results = [];
      for (const d of items) {
        const id = crypto.randomUUID();
        const addr = d.address || {};
        insert.run(id, d.name, d.ownerName, d.email || null, d.phone, addr.street || null, addr.city, addr.state, addr.zipCode || null, addr.country || 'US', d.category || 'general', d.tier || 'bronze', d.assignedTo, d.distributor, d.creditLimit || 5000, now, now);
        results.push({ _id: id, ...d });
      }
      return results;
    });
    return tx(items);
  }
};

module.exports = Retailer;
