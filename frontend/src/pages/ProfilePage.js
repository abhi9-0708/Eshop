import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';
import { getRoleBadge, formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';
import { HiUser, HiLockClosed, HiMail, HiPhone, HiLocationMarker } from 'react-icons/hi';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', territory: user?.territory || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const api = (await import('../services/api')).default;
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed');
      setChangingPw(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="My Profile" subtitle="View and manage your account" />

      {/* Profile Info Card */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${roleBadge.className}`}>{roleBadge.label}</span>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-primary ml-auto text-sm">Edit Profile</button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <div className="relative mt-1"><HiUser className="absolute left-3 top-2.5 text-gray-400" /><input type="text" className="input-field pl-10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative mt-1"><HiMail className="absolute left-3 top-2.5 text-gray-400" /><input type="email" className="input-field pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <div className="relative mt-1"><HiPhone className="absolute left-3 top-2.5 text-gray-400" /><input type="text" className="input-field pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Territory</label>
              <div className="relative mt-1"><HiLocationMarker className="absolute left-3 top-2.5 text-gray-400" /><input type="text" className="input-field pl-10" value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Email</p><p className="font-medium">{user?.email}</p></div>
            <div><p className="text-gray-500">Phone</p><p className="font-medium">{user?.phone || '—'}</p></div>
            <div><p className="text-gray-500">Territory</p><p className="font-medium">{user?.territory || '—'}</p></div>
            <div><p className="text-gray-500">Last Login</p><p className="font-medium">{user?.lastLogin ? formatDateTime(user.lastLogin) : '—'}</p></div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><HiLockClosed /> Change Password</h3>
          {!changingPw && <button onClick={() => setChangingPw(true)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Change</button>}
        </div>
        {changingPw ? (
          <form onSubmit={handlePwChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <input type="password" className="input-field mt-1" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input type="password" className="input-field mt-1" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input type="password" className="input-field mt-1" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Changing...' : 'Update Password'}</button>
              <button type="button" onClick={() => { setChangingPw(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500">Keep your account secure by using a strong password.</p>
        )}
      </div>
    </div>
  );
}
