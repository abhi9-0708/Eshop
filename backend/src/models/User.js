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
  findById(id, withPassword = false) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE _id = ?').get(id);
    if (!row) return null;
    const user = formatUser(row);
    if (withPassword) user.password = row.password;
    return user;
  },

  findByEmail(email, withPassword = false) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) return null;
    const user = formatUser(row);
    if (withPassword) user.password = row.password;
    return user;
  },

  findAll({ where = '1=1', params = [], orderBy = 'createdAt DESC', limit = 20, offset = 0, excludeFields = [] } = {}) {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM users WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return rows.map(r => formatUser(r));
  },

  async create(data) {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    db.prepare(`INSERT INTO users (_id, name, email, password, role, phone, territory, distributor, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(
      id, data.name, data.email, hashedPassword,
      data.role || 'sales_rep', data.phone || null, data.territory || null,
      data.distributor || null, now, now
    );
    return User.findById(id);
  },

  update(id, data) {
    const db = getDb();
    const sets = [];
    const values = [];
    const allowed = ['name', 'email', 'role', 'phone', 'territory', 'isActive', 'distributor', 'lastLogin', 'avatar', 'password'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(key === 'isActive' ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (sets.length === 0) return User.findById(id);
    sets.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE _id = ?`).run(...values);
    return User.findById(id);
  },

  delete(id) {
    const db = getDb();
    db.prepare('DELETE FROM users WHERE _id = ?').run(id);
  },

  count(where = '1=1', params = []) {
    const db = getDb();
    const row = db.prepare(`SELECT COUNT(*) as count FROM users WHERE ${where}`).get(...params);
    return row.count;
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
