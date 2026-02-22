import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { reportService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, PageHeader } from '../components/UI';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function ReportsPage() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('day');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { groupBy };
        if (dateRange.startDate) params.startDate = dateRange.startDate;
        if (dateRange.endDate) params.endDate = dateRange.endDate;

        const [salesRes, perfRes] = await Promise.all([
          reportService.getSales(params),
          reportService.getPerformance(params)
        ]);
        setSalesData(salesRes.data.data);
        setPerfData(perfRes.data.data);
      } catch (err) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupBy, dateRange]);

  if (loading) return <LoadingSpinner size="lg" />;

  const salesChartData = {
    labels: salesData?.salesData?.map(d => d._id) || [],
    datasets: [
      {
        label: 'Revenue',
        data: salesData?.salesData?.map(d => d.totalRevenue) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Orders',
        data: salesData?.salesData?.map(d => d.orderCount) || [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };

  const repChartData = {
    labels: perfData?.repPerformance?.map(r => r.name) || [],
    datasets: [{
      label: 'Revenue',
      data: perfData?.repPerformance?.map(r => r.totalRevenue) || [],
      backgroundColor: '#3b82f6',
      borderRadius: 8
    }]
  };

  const categoryChartData = {
    labels: perfData?.categoryBreakdown?.map(c => c._id) || [],
    datasets: [{
      label: 'Revenue',
      data: perfData?.categoryBreakdown?.map(c => c.totalRevenue) || [],
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      borderRadius: 8
    }]
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales analytics and performance reports" />

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input-field">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="input-field" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesData?.summary?.totalRevenue)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{salesData?.summary?.totalOrders || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesData?.summary?.avgOrderValue)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Largest Order</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(salesData?.summary?.maxOrder)}</p>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
        <div className="h-[350px]">
          {salesData?.salesData?.length > 0 ? (
            <Line data={salesChartData} options={{
              responsive: true, maintainAspectRatio: false,
              scales: { y: { beginAtZero: true }, y1: { position: 'right', grid: { drawOnChartArea: false } } }
            }} />
          ) : <p className="text-gray-400 text-center py-16">No sales data for selected period</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Rep Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sales Rep Performance</h3>
          <div className="h-[300px]">
            {perfData?.repPerformance?.length > 0 ? (
              <Bar data={repChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            ) : <p className="text-gray-400 text-center py-16">No performance data</p>}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Category Revenue</h3>
          <div className="h-[300px]">
            {perfData?.categoryBreakdown?.length > 0 ? (
              <Bar data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} />
            ) : <p className="text-gray-400 text-center py-16">No category data</p>}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Top Products</h3>
        {salesData?.topProducts?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesData.topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{p._id}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.sku}</td>
                    <td className="px-4 py-3 text-sm text-right">{p.totalQuantity}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(p.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-400 text-center py-8">No product data</p>}
      </div>
    </div>
  );
}
