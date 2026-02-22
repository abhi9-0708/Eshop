import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import { orderService } from '../services/dataService';
import { PageHeader, LoadingSpinner, Pagination, Badge, EmptyState } from '../components/UI';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', paymentStatus: '' });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      const { data } = await orderService.getAll(params);
      setOrders(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div>
      <PageHeader title="Orders" subtitle={`Order management (${pagination.total} total)`}>
        <Link to="/orders/create" className="btn-primary flex items-center">
          <HiOutlinePlus className="h-5 w-5 mr-1" /> New Order
        </Link>
      </PageHeader>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field max-w-[180px]">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })} className="input-field max-w-[180px]">
            <option value="">All Payment</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : orders.length === 0 ? (
        <div className="card"><EmptyState title="No orders found" message="Create your first order to get started." /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order._id} onClick={() => navigate(`/orders/${order._id}`)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 text-sm font-medium text-primary-600">{order.orderNumber}</td>
                    <td className="px-6 py-4 text-sm">{order.retailer?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{order.items?.length || 0} items</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4"><Badge className={getStatusColor(order.status)}>{order.status}</Badge></td>
                    <td className="px-6 py-4"><Badge className={getStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => fetchOrders(p)} />
        </div>
      )}
    </div>
  );
}
