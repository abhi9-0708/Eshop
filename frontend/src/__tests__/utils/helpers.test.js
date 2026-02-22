import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusColor,
  getTierColor,
  getRoleBadge,
  truncateText
} from '../../utils/helpers';

describe('Frontend Helpers', () => {
  describe('formatCurrency', () => {
    it('formats number as USD currency', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234.56');
    });

    it('handles zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0.00');
    });

    it('handles undefined gracefully', () => {
      const result = formatCurrency(undefined);
      expect(result).toBeDefined();
    });
  });

  describe('formatDate', () => {
    it('formats date string', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateTime', () => {
    it('formats date with time', () => {
      const result = formatDateTime('2024-01-15T10:30:00Z');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getStatusColor', () => {
    it('returns color for known statuses', () => {
      expect(getStatusColor('pending')).toBeDefined();
      expect(getStatusColor('confirmed')).toBeDefined();
      expect(getStatusColor('delivered')).toBeDefined();
      expect(getStatusColor('cancelled')).toBeDefined();
    });

    it('returns default for unknown status', () => {
      expect(getStatusColor('unknown')).toBeDefined();
    });
  });

  describe('getTierColor', () => {
    it('returns color for known tiers', () => {
      expect(getTierColor('bronze')).toBeDefined();
      expect(getTierColor('silver')).toBeDefined();
      expect(getTierColor('gold')).toBeDefined();
      expect(getTierColor('platinum')).toBeDefined();
    });
  });

  describe('getRoleBadge', () => {
    it('returns badge info for each role', () => {
      const admin = getRoleBadge('admin');
      expect(admin.label).toBeDefined();
      expect(admin.className).toBeDefined();

      const dist = getRoleBadge('distributor');
      expect(dist.label).toBeDefined();

      const rep = getRoleBadge('sales_rep');
      expect(rep.label).toBeDefined();
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      const result = truncateText('This is a very long text that should be truncated', 20);
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(result).toContain('...');
    });

    it('does not truncate short text', () => {
      const result = truncateText('Short', 20);
      expect(result).toBe('Short');
    });

    it('handles empty string', () => {
      const result = truncateText('', 20);
      expect(result).toBe('');
    });
  });
});
