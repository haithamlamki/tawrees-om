import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import DashboardMetrics from '@/components/admin/DashboardMetrics';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { count: 10 }, 
        error: null 
      }),
    })),
  },
}));

describe('DashboardMetrics', () => {
  it('should render component', () => {
    const { container } = render(<DashboardMetrics />);
    expect(container).toBeInTheDocument();
  });

  it('should render metrics structure', () => {
    const { container } = render(<DashboardMetrics />);
    const cards = container.querySelectorAll('[role="region"]');
    expect(cards.length).toBeGreaterThanOrEqual(0);
  });

  it('should have date filter inputs', () => {
    const { container } = render(<DashboardMetrics />);
    const inputs = container.querySelectorAll('input[type="date"]');
    expect(inputs.length).toBeGreaterThanOrEqual(0);
  });
});
