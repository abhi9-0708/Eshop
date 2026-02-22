export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getTierColor = (tier) => {
  const colors = {
    platinum: 'bg-purple-100 text-purple-800',
    gold: 'bg-yellow-100 text-yellow-800',
    silver: 'bg-gray-200 text-gray-700',
    bronze: 'bg-orange-100 text-orange-800'
  };
  return colors[tier] || 'bg-gray-100 text-gray-800';
};

export const getRoleBadge = (role) => {
  const colors = {
    admin: 'bg-red-100 text-red-800',
    distributor: 'bg-blue-100 text-blue-800',
    sales_rep: 'bg-green-100 text-green-800'
  };
  const labels = { admin: 'Admin', distributor: 'Distributor', sales_rep: 'Sales Rep' };
  return { color: colors[role] || 'bg-gray-100 text-gray-800', label: labels[role] || role };
};

export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
