import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineUserGroup, HiOutlineCube, HiOutlineShoppingCart, HiOutlineCurrencyDollar, HiOutlineClock, HiOutlineUsers } from 'react-icons/hi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { dashboardService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { StatCard, LoadingSpinner, PageHeader } from '../components/UI';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await dashboardService.getStats();
        setStats(data.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const statusChartData = {
    labels: stats?.statusDistribution?.map(s => s._id?.charAt(0).toUpperCase() + s._id?.slice(1)) || [],
    datasets: [{
      data: stats?.statusDistribution?.map(s => s.count) || [],
      backgroundColor: ['#fbbf24', '#3b82f6', '#6366f1', '#8b5cf6', '#22c55e', '#ef4444'],
      borderWidth: 0
    }]
  };

  const topRetailersData = {
    labels: stats?.topRetailers?.map(r => r.retailerName) || [],
    datasets: [{
      label: 'Revenue',
      data: stats?.topRetailers?.map(r => r.totalRevenue) || [],
      backgroundColor: '#3b82f6',
      borderRadius: 8
    }]
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}!`}
        subtitle={`Here's what's happening with your ${user?.role === 'admin' ? 'platform' : 'territory'} today.`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Retailers" value={stats?.totalRetailers || 0} icon={HiOutlineUserGroup} color="blue" />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={HiOutlineShoppingCart} color="green" />
        <StatCard title="Monthly Revenue" value={formatCurrency(stats?.monthlyRevenue)} icon={HiOutlineCurrencyDollar} color="purple" />
        <StatCard title="Pending Orders" value={stats?.pendingOrders || 0} icon={HiOutlineClock} color="yellow" />
      </div>

      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <StatCard title="Active Products" value={stats?.totalProducts || 0} icon={HiOutlineCube} color="primary" />
          <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={HiOutlineUsers} color="red" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          <div className="h-[280px] flex items-center justify-center">
            {stats?.statusDistribution?.length > 0 ? (
              <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            ) : (
              <p className="text-gray-400">No data available</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Retailers by Revenue</h3>
          <div className="h-[280px] flex items-center justify-center">
            {stats?.topRetailers?.length > 0 ? (
              <Bar data={topRetailersData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
            ) : (
              <p className="text-gray-400">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</Link>
        </div>
        {stats?.recentOrders?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retailer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/orders/${order._id}`} className="text-primary-600 hover:underline font-medium">{order.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.retailer?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusColor(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No recent orders</p>
        )}
      </div>
    </div>
  );
}
