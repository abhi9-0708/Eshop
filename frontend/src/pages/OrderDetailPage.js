import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { orderService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, Badge, PageHeader } from '../components/UI';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await orderService.getById(id);
        setOrder(data.data);
      } catch (err) {
        toast.error('Failed to load order');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const { data } = await orderService.updateStatus(id, { status: newStatus });
      setOrder(data.data);
      toast.success(`Order ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Status update failed');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatuses = (currentStatus) => {
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };
    return transitions[currentStatus] || [];
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!order) return null;

  const nextStatuses = getNextStatuses(order.status);

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/orders" className="mr-4 text-gray-500 hover:text-gray-700"><HiOutlineArrowLeft className="h-5 w-5" /></Link>
        <PageHeader title={`Order ${order.orderNumber}`} subtitle={`Created on ${formatDate(order.createdAt)}`}>
          {nextStatuses.map(status => (
            <button key={status} onClick={() => handleStatusChange(status)} disabled={updating}
              className={status === 'cancelled' ? 'btn-danger' : 'btn-primary'}>
              {status === 'cancelled' ? 'Cancel' : `Mark ${status.charAt(0).toUpperCase() + status.slice(1)}`}
            </button>
          ))}
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-sm font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right">{item.discount}%</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr><td colSpan="5" className="px-4 py-2 text-sm text-right font-medium">Subtotal</td><td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(order.subtotal)}</td></tr>
                  <tr><td colSpan="5" className="px-4 py-2 text-sm text-right">Tax ({order.taxRate}%)</td><td className="px-4 py-2 text-sm text-right">{formatCurrency(order.taxAmount)}</td></tr>
                  <tr><td colSpan="5" className="px-4 py-2 text-sm text-right font-bold text-gray-900">Total</td><td className="px-4 py-2 text-sm text-right font-bold text-gray-900">{formatCurrency(order.totalAmount)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Status History */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Status History</h3>
            <div className="space-y-3">
              {order.statusHistory?.map((h, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium capitalize">{h.status}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(h.changedAt)}</p>
                    {h.notes && <p className="text-xs text-gray-400">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Order Info</h3>
            <dl className="space-y-3">
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Status</dt><dd><Badge className={getStatusColor(order.status)}>{order.status}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Payment</dt><dd><Badge className={getStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Method</dt><dd className="text-sm capitalize">{order.paymentMethod?.replace('_', ' ')}</dd></div>
              {order.deliveryDate && <div className="flex justify-between"><dt className="text-sm text-gray-500">Delivery</dt><dd className="text-sm">{formatDate(order.deliveryDate)}</dd></div>}
            </dl>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Retailer</h3>
            <p className="font-medium">{order.retailer?.name}</p>
            <p className="text-sm text-gray-500">{order.retailer?.ownerName}</p>
            <p className="text-sm text-gray-500">{order.retailer?.phone}</p>
            {order.retailer?.address && (
              <p className="text-sm text-gray-400 mt-1">
                {order.retailer.address.city}, {order.retailer.address.state}
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">People</h3>
            <div className="space-y-2">
              <div><p className="text-xs text-gray-500">Sales Rep</p><p className="text-sm font-medium">{order.salesRep?.name}</p></div>
              <div><p className="text-xs text-gray-500">Distributor</p><p className="text-sm font-medium">{order.distributor?.name}</p></div>
            </div>
          </div>

          {order.notes && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
