import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  LoadingSpinner,
  PageHeader,
  EmptyState,
  StatCard,
  Badge,
  SearchInput
} from '../../components/UI';

describe('UI Components', () => {
  describe('LoadingSpinner', () => {
    it('renders spinner', () => {
      render(<LoadingSpinner />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('PageHeader', () => {
    it('renders title', () => {
      render(<PageHeader title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      render(<PageHeader title="Title" subtitle="Subtitle text" />);
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('renders action button', () => {
      const action = <button>Click Me</button>;
      render(<PageHeader title="Title" action={action} />);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders message', () => {
      render(<EmptyState message="No data found" />);
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });

    it('renders action when provided', () => {
      const action = <button>Add Item</button>;
      render(<EmptyState message="Empty" action={action} />);
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
  });

  describe('StatCard', () => {
    it('renders title and value', () => {
      render(<StatCard title="Total Sales" value="$1,000" />);
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(<StatCard title="Sales" value="100" subtitle="+5% growth" />);
      expect(screen.getByText('+5% growth')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('renders with text', () => {
      render(<Badge color="green">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies color class', () => {
      const { container } = render(<Badge color="red">Error</Badge>);
      expect(container.firstChild).toHaveClass('bg-red-100');
    });
  });

  describe('SearchInput', () => {
    it('renders with placeholder', () => {
      render(<SearchInput value="" onChange={() => {}} placeholder="Search items..." />);
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
    });

    it('displays current value', () => {
      render(<SearchInput value="test query" onChange={() => {}} />);
      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });
  });
});
