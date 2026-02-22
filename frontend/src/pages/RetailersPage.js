import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import { retailerService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { PageHeader, LoadingSpinner, Pagination, Badge, Modal, EmptyState } from '../components/UI';
import { getStatusColor, getTierColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function RetailersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: '', category: '', tier: '' });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', ownerName: '', phone: '', email: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    category: 'general', tier: 'bronze', creditLimit: 5000, notes: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchRetailers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.tier) params.tier = filters.tier;

      const { data } = await retailerService.getAll(params);
      setRetailers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load retailers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchRetailers(); }, [fetchRetailers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await retailerService.create(formData);
      toast.success('Retailer created successfully');
      setShowModal(false);
      setFormData({ name: '', ownerName: '', phone: '', email: '', address: { street: '', city: '', state: '', zipCode: '' }, category: 'general', tier: 'bronze', creditLimit: 5000, notes: '' });
      fetchRetailers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create retailer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Retailers" subtitle={`Manage your retail partners (${pagination.total} total)`}>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
          <HiOutlinePlus className="h-5 w-5 mr-1" /> Add Retailer
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Search retailers..." value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-field pl-10" />
          </div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field max-w-[150px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="input-field max-w-[150px]">
            <option value="">All Categories</option>
            <option value="grocery">Grocery</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="electronics">Electronics</option>
            <option value="general">General</option>
            <option value="wholesale">Wholesale</option>
          </select>
          <select value={filters.tier} onChange={(e) => setFilters({ ...filters, tier: e.target.value })} className="input-field max-w-[150px]">
            <option value="">All Tiers</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : retailers.length === 0 ? (
        <div className="card"><EmptyState title="No retailers found" message="Try adjusting your filters or add a new retailer." /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {retailers.map(r => (
                  <tr key={r._id} onClick={() => navigate(`/retailers/${r._id}`)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 text-sm font-medium text-primary-600">{r.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.ownerName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.address?.city}, {r.address?.state}</td>
                    <td className="px-6 py-4 text-sm capitalize">{r.category}</td>
                    <td className="px-6 py-4"><Badge className={getTierColor(r.tier)}>{r.tier}</Badge></td>
                    <td className="px-6 py-4"><Badge className={getStatusColor(r.status)}>{r.status}</Badge></td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.totalOrders || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => fetchRetailers(p)} />
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Retailer" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
              <input type="text" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input type="text" value={formData.address.street} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input type="text" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input type="text" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input type="text" value={formData.address.zipCode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })} className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field">
                <option value="grocery">Grocery</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="general">General</option>
                <option value="wholesale">Wholesale</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select value={formData.tier} onChange={(e) => setFormData({ ...formData, tier: e.target.value })} className="input-field">
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
              <input type="number" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })} className="input-field" min="0" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows="2" />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Retailer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
