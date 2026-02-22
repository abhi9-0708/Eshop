import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import { retailerService, productService, orderService } from '../services/dataService';
import { PageHeader, LoadingSpinner } from '../components/UI';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [retailers, setRetailers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    retailer: '',
    items: [{ product: '', quantity: 1, discount: 0 }],
    notes: '',
    paymentMethod: 'cash',
    taxRate: 8
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [retRes, prodRes] = await Promise.all([
          retailerService.getAll({ limit: 100 }),
          productService.getAll({ limit: 100 })
        ]);
        setRetailers(retRes.data.data);
        setProducts(prodRes.data.data);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { product: '', quantity: 1, discount: 0 }] });
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm({ ...form, items });
  };

  const getItemTotal = (item) => {
    const product = products.find(p => p._id === item.product);
    if (!product) return 0;
    return item.quantity * product.price * (1 - (item.discount || 0) / 100);
  };

  const subtotal = form.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const taxAmount = subtotal * (form.taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.retailer) return toast.error('Please select a retailer');
    if (form.items.some(i => !i.product)) return toast.error('Please select all products');

    setSubmitting(true);
    try {
      const { data } = await orderService.create({
        retailer: form.retailer,
        items: form.items.map(i => ({
          product: i.product,
          quantity: parseInt(i.quantity),
          discount: parseFloat(i.discount) || 0
        })),
        notes: form.notes,
        paymentMethod: form.paymentMethod,
        taxRate: parseFloat(form.taxRate)
      });
      toast.success('Order created successfully!');
      navigate(`/orders/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Create Order" subtitle="Create a new order for a retailer" />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Retailer Selection */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Retailer</h3>
              <select value={form.retailer} onChange={(e) => setForm({ ...form, retailer: e.target.value })} className="input-field" required>
                <option value="">Select a retailer...</option>
                {retailers.filter(r => r.status === 'active').map(r => (
                  <option key={r._id} value={r._id}>{r.name} - {r.ownerName} ({r.address?.city})</option>
                ))}
              </select>
            </div>

            {/* Order Items */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Items</h3>
                <button type="button" onClick={addItem} className="btn-secondary text-sm flex items-center">
                  <HiOutlinePlus className="h-4 w-4 mr-1" /> Add Item
                </button>
              </div>

              <div className="space-y-4">
                {form.items.map((item, index) => (
                  <div key={index} className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                      <select value={item.product} onChange={(e) => updateItem(index, 'product', e.target.value)} className="input-field text-sm" required>
                        <option value="">Select product...</option>
                        {products.filter(p => p.isActive && p.stock > 0).map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({formatCurrency(p.price)}) - Stock: {p.stock}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="input-field text-sm" min="1" required />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Discount %</label>
                      <input type="number" value={item.discount} onChange={(e) => updateItem(index, 'discount', e.target.value)} className="input-field text-sm" min="0" max="100" />
                    </div>
                    <div className="w-28 text-right">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Line Total</label>
                      <p className="py-2 text-sm font-medium">{formatCurrency(getItemTotal(item))}</p>
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2" disabled={form.items.length <= 1}>
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows="3" placeholder="Order notes (optional)" />
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Payment</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="input-field" min="0" max="30" step="0.5" />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm"><dt className="text-gray-500">Items</dt><dd>{form.items.filter(i => i.product).length}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-gray-500">Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-gray-500">Tax ({form.taxRate}%)</dt><dd>{formatCurrency(taxAmount)}</dd></div>
                <hr />
                <div className="flex justify-between font-bold text-lg"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
              </dl>

              <button type="submit" disabled={submitting} className="btn-primary w-full mt-6">
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
              <button type="button" onClick={() => navigate('/orders')} className="btn-secondary w-full mt-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
