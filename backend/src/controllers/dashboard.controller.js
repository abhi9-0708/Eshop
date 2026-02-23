const { getDb } = require('../config/database');

// GET /api/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const pool = getDb();
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    let orderWhere = '1=1';
    let retailerWhere = '1=1';
    const orderParams = [];
    const retailerParams = [];

    if (role === 'distributor') {
      orderWhere = 'o.distributor = $1';
      orderParams.push(userId);
      retailerWhere = 'r.distributor = $1';
      retailerParams.push(userId);
    } else if (role === 'sales_rep') {
      orderWhere = 'o."salesRep" = $1';
      orderParams.push(userId);
      retailerWhere = 'r."assignedTo" = $1';
      retailerParams.push(userId);
    }

    // Counts
    const { rows: retRows } = await pool.query(`SELECT COUNT(*) as count FROM retailers r WHERE ${retailerWhere}`, retailerParams);
    const totalRetailers = parseInt(retRows[0].count);

    const { rows: ordRows } = await pool.query(`SELECT COUNT(*) as count FROM orders o WHERE ${orderWhere}`, orderParams);
    const totalOrders = parseInt(ordRows[0].count);

    const { rows: prodRows } = await pool.query('SELECT COUNT(*) as count FROM products WHERE "isActive" = true');
    const totalProducts = parseInt(prodRows[0].count);

    const { rows: userRows } = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(userRows[0].count);

    // Revenue calculation (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueParamIdx = orderParams.length + 1;
    const { rows: revenueRows } = await pool.query(`
      SELECT COALESCE(SUM("totalAmount"), 0) as revenue
      FROM orders o
      WHERE ${orderWhere} AND o.status != 'cancelled' AND o."createdAt" >= $${revenueParamIdx}
    `, [...orderParams, startOfMonth.toISOString()]);
    const monthlyRevenue = revenueRows[0].revenue;

    // Recent orders
    const { rows: recentRows } = await pool.query(`
      SELECT o.*,
        ret.name as ret_name, sr.name as sr_name
      FROM orders o
      LEFT JOIN retailers ret ON o.retailer = ret._id
      LEFT JOIN users sr ON o."salesRep" = sr._id
      WHERE ${orderWhere}
      ORDER BY o."createdAt" DESC LIMIT 5
    `, orderParams);
    const recentOrders = recentRows.map(row => ({
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
    const { rows: statusDistribution } = await pool.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM("totalAmount"), 0) as "totalAmount"
      FROM orders o WHERE ${orderWhere}
      GROUP BY status
    `, orderParams);

    // Top retailers
    const { rows: topRetRows } = await pool.query(`
      SELECT o.retailer as "retailerId", ret.name, ret."ownerName",
        COUNT(*) as "orderCount", COALESCE(SUM(o."totalAmount"), 0) as "totalRevenue"
      FROM orders o
      LEFT JOIN retailers ret ON o.retailer = ret._id
      WHERE ${orderWhere} AND o.status != 'cancelled'
      GROUP BY o.retailer, ret.name, ret."ownerName"
      ORDER BY "totalRevenue" DESC
      LIMIT 5
    `, orderParams);
    const topRetailers = topRetRows.map(row => ({
      retailer: { _id: row.retailerId, name: row.name, ownerName: row.ownerName },
      orderCount: parseInt(row.orderCount),
      totalRevenue: parseFloat(row.totalRevenue)
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
