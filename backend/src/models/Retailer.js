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
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };

  if (row.at_id) {
    r.assignedTo = { _id: row.at_id, name: row.at_name, email: row.at_email, phone: row.at_phone };
  } else {
    r.assignedTo = row.assignedTo;
  }

  if (row.dist_id) {
    r.distributor = { _id: row.dist_id, name: row.dist_name, email: row.dist_email, phone: row.dist_phone };
  } else {
    r.distributor = row.distributor;
  }

  return r;
}

const POPULATE_JOIN = `
  LEFT JOIN users a ON r."assignedTo" = a._id
  LEFT JOIN users d ON r.distributor = d._id
`;
const POPULATE_COLS = `,
  a._id as at_id, a.name as at_name, a.email as at_email, a.phone as at_phone,
  d._id as dist_id, d.name as dist_name, d.email as dist_email, d.phone as dist_phone
`;

const Retailer = {
  async findById(id, populate = false) {
    const pool = getDb();
    let sql;
    if (populate) {
      sql = `SELECT r.* ${POPULATE_COLS} FROM retailers r ${POPULATE_JOIN} WHERE r._id = $1`;
    } else {
      sql = 'SELECT * FROM retailers WHERE _id = $1';
    }
    const { rows } = await pool.query(sql, [id]);
    return formatRetailer(rows[0]);
  },

  async findAll({ where = '1=1', params = [], orderBy = 'r."createdAt" DESC', limit = 20, offset = 0, populate = false } = {}) {
    const pool = getDb();
    const paramCount = params.length;
    let sql;
    if (populate) {
      sql = `SELECT r.* ${POPULATE_COLS} FROM retailers r ${POPULATE_JOIN} WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    } else {
      sql = `SELECT r.* FROM retailers r WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    }
    const { rows } = await pool.query(sql, [...params, limit, offset]);
    return rows.map(formatRetailer);
  },

  async create(data) {
    const pool = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const addr = data.address || {};
    await pool.query(
      `INSERT INTO retailers (_id, name, "ownerName", email, phone, "addressStreet", "addressCity", "addressState", "addressZipCode", "addressCountry", category, tier, status, "assignedTo", distributor, "creditLimit", notes, tags, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [id, data.name, data.ownerName, data.email || null, data.phone,
       addr.street || null, addr.city, addr.state, addr.zipCode || null, addr.country || 'US',
       data.category || 'general', data.tier || 'bronze', data.status || 'active',
       data.assignedTo, data.distributor, data.creditLimit || 5000,
       data.notes || null, JSON.stringify(data.tags || []), now, now]
    );
    return Retailer.findById(id, true);
  },

  async update(id, data) {
    const pool = getDb();
    const sets = [];
    const values = [];
    let paramIdx = 1;
    const allowed = ['name', 'ownerName', 'email', 'phone', 'category', 'tier', 'status', 'assignedTo', 'distributor', 'creditLimit', 'outstandingBalance', 'totalOrders', 'lastOrderDate', 'notes'];
    const quotedCols = ['ownerName', 'assignedTo', 'creditLimit', 'outstandingBalance', 'totalOrders', 'lastOrderDate'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        const col = quotedCols.includes(key) ? `"${key}"` : key;
        sets.push(`${col} = $${paramIdx++}`);
        values.push(data[key]);
      }
    }
    if (data.address) {
      if (data.address.street !== undefined) { sets.push(`"addressStreet" = $${paramIdx++}`); values.push(data.address.street); }
      if (data.address.city !== undefined) { sets.push(`"addressCity" = $${paramIdx++}`); values.push(data.address.city); }
      if (data.address.state !== undefined) { sets.push(`"addressState" = $${paramIdx++}`); values.push(data.address.state); }
      if (data.address.zipCode !== undefined) { sets.push(`"addressZipCode" = $${paramIdx++}`); values.push(data.address.zipCode); }
      if (data.address.country !== undefined) { sets.push(`"addressCountry" = $${paramIdx++}`); values.push(data.address.country); }
    }
    if (data.tags) { sets.push(`tags = $${paramIdx++}`); values.push(JSON.stringify(data.tags)); }
    if (sets.length === 0) return Retailer.findById(id, true);
    sets.push(`"updatedAt" = $${paramIdx++}`);
    values.push(new Date().toISOString());
    values.push(id);
    await pool.query(`UPDATE retailers SET ${sets.join(', ')} WHERE _id = $${paramIdx}`, values);
    return Retailer.findById(id, true);
  },

  async delete(id) {
    const pool = getDb();
    await pool.query('DELETE FROM retailers WHERE _id = $1', [id]);
  },

  async count(where = '1=1', params = []) {
    const pool = getDb();
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM retailers r WHERE ${where}`, params);
    return parseInt(rows[0].count);
  },

  async insertMany(items) {
    const pool = getDb();
    const now = new Date().toISOString();
    const results = [];
    for (const d of items) {
      const id = crypto.randomUUID();
      const addr = d.address || {};
      await pool.query(
        `INSERT INTO retailers (_id, name, "ownerName", email, phone, "addressStreet", "addressCity", "addressState", "addressZipCode", "addressCountry", category, tier, status, "assignedTo", distributor, "creditLimit", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14, $15, $16, $17)`,
        [id, d.name, d.ownerName, d.email || null, d.phone,
         addr.street || null, addr.city, addr.state, addr.zipCode || null, addr.country || 'US',
         d.category || 'general', d.tier || 'bronze',
         d.assignedTo, d.distributor, d.creditLimit || 5000, now, now]
      );
      results.push({ _id: id, ...d });
    }
    return results;
  }
};

module.exports = Retailer;
