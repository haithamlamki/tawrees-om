import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WMSNavigation } from '@/components/WMSNavigation';

describe('WMSNavigation', () => {
  it('should render admin navigation links', () => {
    const { getByText } = render(
      <BrowserRouter>
        <WMSNavigation />
      </BrowserRouter>
    );
    
    expect(getByText(/Dashboard/i)).toBeInTheDocument();
    expect(getByText(/Customers/i)).toBeInTheDocument();
    expect(getByText(/Orders/i)).toBeInTheDocument();
    expect(getByText(/Inventory/i)).toBeInTheDocument();
    expect(getByText(/Invoices/i)).toBeInTheDocument();
  });

  it('should have correct navigation structure', () => {
    const { container } = render(
      <BrowserRouter>
        <WMSNavigation />
      </BrowserRouter>
    );
    
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });
});
