import React, { useState, useEffect, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { productService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { PageHeader, LoadingSpinner, Pagination, Badge, Modal, ConfirmModal, EmptyState } from '../components/UI';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', brand: '', price: '', costPrice: '',
    stock: '', unit: 'piece', unitsPerCase: 1, description: '', minOrderQuantity: 1
  });
  const [saving, setSaving] = useState(false);

  const canManage = ['admin', 'distributor'].includes(user?.role);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await productService.getAll(params);
      setProducts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditProduct(null);
    setFormData({ name: '', sku: '', category: '', brand: '', price: '', costPrice: '', stock: '', unit: 'piece', unitsPerCase: 1, description: '', minOrderQuantity: 1 });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name, sku: product.sku, category: product.category, brand: product.brand || '',
      price: product.price, costPrice: product.costPrice || '', stock: product.stock,
      unit: product.unit, unitsPerCase: product.unitsPerCase, description: product.description || '',
      minOrderQuantity: product.minOrderQuantity || 1
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editProduct) {
        await productService.update(editProduct._id, formData);
        toast.success('Product updated');
      } else {
        await productService.create(formData);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await productService.delete(deleteId);
      toast.success('Product deleted');
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Products" subtitle={`Product catalog (${pagination.total} items)`}>
        {canManage && (
          <button onClick={openCreate} className="btn-primary flex items-center">
            <HiOutlinePlus className="h-5 w-5 mr-1" /> Add Product
          </button>
        )}
      </PageHeader>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Search products..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field max-w-[180px]">
            <option value="">All Categories</option>
            <option value="Beverages">Beverages</option>
            <option value="Groceries">Groceries</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Health">Health</option>
            <option value="Home Care">Home Care</option>
            <option value="Snacks">Snacks</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : products.length === 0 ? (
        <div className="card"><EmptyState title="No products found" message="Adjust filters or add a new product." /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {canManage && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      {p.brand && <div className="text-xs text-gray-500">{p.brand}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.sku}</td>
                    <td className="px-6 py-4 text-sm">{p.category}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatCurrency(p.price)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={p.stock < 100 ? 'text-red-600 font-medium' : 'text-gray-700'}>{p.stock}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button onClick={() => openEdit(p)} className="text-primary-600 hover:text-primary-800"><HiOutlinePencil className="h-4 w-4" /></button>
                          {user?.role === 'admin' && (
                            <button onClick={() => setDeleteId(p._id)} className="text-red-600 hover:text-red-800"><HiOutlineTrash className="h-4 w-4" /></button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => fetchProducts(p)} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="input-field" required disabled={!!editProduct} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="input-field" required min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
              <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="input-field">
                <option value="piece">Piece</option>
                <option value="box">Box</option>
                <option value="case">Case</option>
                <option value="kg">Kg</option>
                <option value="liter">Liter</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows="2" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editProduct ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Product" message="Are you sure? This cannot be undone." />
    </div>
  );
}
