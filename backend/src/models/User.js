const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function formatUser(row) {
  if (!row) return null;
  return {
    _id: row._id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    territory: row.territory,
    distributor: row.distributor,
    isActive: Boolean(row.isActive),
    lastLogin: row.lastLogin,
    avatar: row.avatar,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

const User = {
  async findById(id, withPassword = false) {
    const pool = getDb();
    const { rows } = await pool.query('SELECT * FROM users WHERE _id = $1', [id]);
    if (!rows[0]) return null;
    const user = formatUser(rows[0]);
    if (withPassword) user.password = rows[0].password;
    return user;
  },

  async findByEmail(email, withPassword = false) {
    const pool = getDb();
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (!rows[0]) return null;
    const user = formatUser(rows[0]);
    if (withPassword) user.password = rows[0].password;
    return user;
  },

  async findAll({ where = '1=1', params = [], orderBy = '"createdAt" DESC', limit = 20, offset = 0, excludeFields = [] } = {}) {
    const pool = getDb();
    const paramCount = params.length;
    const sql = `SELECT * FROM users WHERE ${where} ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    const { rows } = await pool.query(sql, [...params, limit, offset]);
    return rows.map(r => formatUser(r));
  },

  async create(data) {
    const pool = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    await pool.query(
      `INSERT INTO users (_id, name, email, password, role, phone, territory, distributor, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)`,
      [id, data.name, data.email, hashedPassword,
       data.role || 'sales_rep', data.phone || null, data.territory || null,
       data.distributor || null, now, now]
    );
    return User.findById(id);
  },

  async update(id, data) {
    const pool = getDb();
    const sets = [];
    const values = [];
    let paramIdx = 1;
    const allowed = ['name', 'email', 'role', 'phone', 'territory', 'isActive', 'distributor', 'lastLogin', 'avatar', 'password'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        const col = ['isActive', 'lastLogin'].includes(key) ? `"${key}"` : key;
        sets.push(`${col} = $${paramIdx++}`);
        values.push(key === 'isActive' ? Boolean(data[key]) : data[key]);
      }
    }
    if (sets.length === 0) return User.findById(id);
    sets.push(`"updatedAt" = $${paramIdx++}`);
    values.push(new Date().toISOString());
    values.push(id);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE _id = $${paramIdx}`, values);
    return User.findById(id);
  },

  async delete(id) {
    const pool = getDb();
    await pool.query('DELETE FROM users WHERE _id = $1', [id]);
  },

  async count(where = '1=1', params = []) {
    const pool = getDb();
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM users WHERE ${where}`, params);
    return parseInt(rows[0].count);
  },

  async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  },

  generateToken(user) {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  },

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
};

module.exports = User;
