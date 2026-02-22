import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { retailerService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, Badge, ConfirmModal, PageHeader } from '../components/UI';
import { formatCurrency, formatDate, getStatusColor, getTierColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function RetailerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [retailer, setRetailer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await retailerService.getById(id);
        setRetailer(data.data);
        setEditForm(data.data);
      } catch (err) {
        toast.error('Failed to load retailer');
        navigate('/retailers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await retailerService.update(id, editForm);
      setRetailer(data.data);
      setEditing(false);
      toast.success('Retailer updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const handleDelete = async () => {
    try {
      await retailerService.delete(id);
      toast.success('Retailer deleted');
      navigate('/retailers');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!retailer) return null;

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/retailers" className="mr-4 text-gray-500 hover:text-gray-700"><HiOutlineArrowLeft className="h-5 w-5" /></Link>
        <PageHeader title={retailer.name} subtitle={`Owned by ${retailer.ownerName}`}>
          {(user?.role === 'admin' || user?.role === 'distributor') && (
            <>
              <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center">
                <HiOutlinePencil className="h-4 w-4 mr-1" /> Edit
              </button>
              <button onClick={() => setShowDelete(true)} className="btn-danger flex items-center">
                <HiOutlineTrash className="h-4 w-4 mr-1" /> Delete
              </button>
            </>
          )}
        </PageHeader>
      </div>

      {editing ? (
        <div className="card">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input type="text" value={editForm.ownerName || ''} onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="input-field">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select value={editForm.tier || ''} onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })} className="input-field">
                  <option value="platinum">Platinum</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="bronze">Bronze</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                <input type="number" value={editForm.creditLimit || 0} onChange={(e) => setEditForm({ ...editForm, creditLimit: parseFloat(e.target.value) })} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Retailer Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><dt className="text-sm text-gray-500">Phone</dt><dd className="font-medium">{retailer.phone}</dd></div>
                <div><dt className="text-sm text-gray-500">Email</dt><dd className="font-medium">{retailer.email || 'N/A'}</dd></div>
                <div><dt className="text-sm text-gray-500">Category</dt><dd className="font-medium capitalize">{retailer.category}</dd></div>
                <div><dt className="text-sm text-gray-500">Tier</dt><dd><Badge className={getTierColor(retailer.tier)}>{retailer.tier}</Badge></dd></div>
                <div><dt className="text-sm text-gray-500">Status</dt><dd><Badge className={getStatusColor(retailer.status)}>{retailer.status}</Badge></dd></div>
                <div><dt className="text-sm text-gray-500">Created</dt><dd className="font-medium">{formatDate(retailer.createdAt)}</dd></div>
              </dl>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Address</h3>
              <p className="text-gray-700">
                {retailer.address?.street && <>{retailer.address.street}<br /></>}
                {retailer.address?.city}, {retailer.address?.state} {retailer.address?.zipCode}
              </p>
            </div>

            {retailer.notes && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Notes</h3>
                <p className="text-gray-600">{retailer.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Financial</h3>
              <dl className="space-y-3">
                <div className="flex justify-between"><dt className="text-sm text-gray-500">Credit Limit</dt><dd className="font-medium">{formatCurrency(retailer.creditLimit)}</dd></div>
                <div className="flex justify-between"><dt className="text-sm text-gray-500">Outstanding</dt><dd className="font-medium text-red-600">{formatCurrency(retailer.outstandingBalance)}</dd></div>
                <div className="flex justify-between"><dt className="text-sm text-gray-500">Total Orders</dt><dd className="font-medium">{retailer.totalOrders}</dd></div>
                <div className="flex justify-between"><dt className="text-sm text-gray-500">Last Order</dt><dd className="font-medium">{formatDate(retailer.lastOrderDate)}</dd></div>
              </dl>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Assigned To</h3>
              <p className="font-medium">{retailer.assignedTo?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{retailer.assignedTo?.email}</p>
              <hr className="my-3" />
              <p className="text-sm text-gray-500">Distributor</p>
              <p className="font-medium">{retailer.distributor?.name || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Retailer" message={`Are you sure you want to delete "${retailer.name}"? This action cannot be undone.`} />
    </div>
  );
}
