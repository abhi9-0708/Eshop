const { getDb } = require('../config/database');

// GET /api/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    let orderWhere = '1=1';
    let retailerWhere = '1=1';
    const orderParams = [];
    const retailerParams = [];

    if (role === 'distributor') {
      orderWhere = 'o.distributor = ?';
      orderParams.push(userId);
      retailerWhere = 'r.distributor = ?';
      retailerParams.push(userId);
    } else if (role === 'sales_rep') {
      orderWhere = 'o.salesRep = ?';
      orderParams.push(userId);
      retailerWhere = 'r.assignedTo = ?';
      retailerParams.push(userId);
    }

    // Counts
    const totalRetailers = db.prepare(`SELECT COUNT(*) as count FROM retailers r WHERE ${retailerWhere}`).get(...retailerParams).count;
    const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders o WHERE ${orderWhere}`).get(...orderParams).count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE isActive = 1').get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    // Revenue calculation (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueResult = db.prepare(`
      SELECT COALESCE(SUM(totalAmount), 0) as revenue
      FROM orders o
      WHERE ${orderWhere} AND o.status != 'cancelled' AND o.createdAt >= ?
    `).get(...orderParams, startOfMonth.toISOString());
    const monthlyRevenue = revenueResult.revenue;

    // Recent orders
    let recentOrdersSQL = `
      SELECT o.*,
        ret.name as ret_name, sr.name as sr_name
      FROM orders o
      LEFT JOIN retailers ret ON o.retailer = ret._id
      LEFT JOIN users sr ON o.salesRep = sr._id
      WHERE ${orderWhere}
      ORDER BY o.createdAt DESC LIMIT 5
    `;
    const recentOrders = db.prepare(recentOrdersSQL).all(...orderParams).map(row => ({
      _id: row._id,
      orderNumber: row.orderNumber,
      retailer: { _id: row.retailer, name: row.ret_name },
      salesRep: { _id: row.salesRep, name: row.sr_name },
      totalAmount: row.totalAmount,
      status: row.status,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt
    }));

    // Status distribution
    const statusDistribution = db.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(totalAmount), 0) as totalAmount
      FROM orders o WHERE ${orderWhere}
      GROUP BY status
    `).all(...orderParams);

    // Top retailers
    const topRetailers = db.prepare(`
      SELECT o.retailer as retailerId, ret.name, ret.ownerName,
        COUNT(*) as orderCount, COALESCE(SUM(o.totalAmount), 0) as totalRevenue
      FROM orders o
      LEFT JOIN retailers ret ON o.retailer = ret._id
      WHERE ${orderWhere} AND o.status != 'cancelled'
      GROUP BY o.retailer
      ORDER BY totalRevenue DESC
      LIMIT 5
    `).all(...orderParams).map(row => ({
      retailer: { _id: row.retailerId, name: row.name, ownerName: row.ownerName },
      orderCount: row.orderCount,
      totalRevenue: row.totalRevenue
    }));

    res.json({
      success: true,
      data: {
        counts: { retailers: totalRetailers, orders: totalOrders, products: totalProducts, users: totalUsers },
        monthlyRevenue,
        recentOrders,
        statusDistribution,
        topRetailers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
