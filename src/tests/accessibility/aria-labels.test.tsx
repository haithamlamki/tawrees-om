import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

/**
 * Accessibility Tests - ARIA Labels and Attributes
 * Tests proper ARIA implementation for screen readers
 */

describe('ARIA Labels and Attributes', () => {
  describe('ARIA Labels', () => {
    it('should have aria-label for icon-only buttons', () => {
      const button = <button aria-label="Close dialog">✕</button>;
      const { getByLabelText } = render(button);
      
      const closeButton = getByLabelText('Close dialog');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have aria-label for search inputs', () => {
      const input = <input type="search" aria-label="Search products" />;
      const { getByLabelText } = render(input);
      
      const searchInput = getByLabelText('Search products');
      expect(searchInput).toBeInTheDocument();
    });

    it('should use aria-labelledby for form sections', () => {
      const form = (
        <section aria-labelledby="billing-heading">
          <h2 id="billing-heading">Billing Information</h2>
          <input type="text" />
        </section>
      );

      const { getByText } = render(form);
      const heading = getByText('Billing Information');
      expect(heading).toHaveAttribute('id', 'billing-heading');
    });

    it('should use aria-describedby for additional context', () => {
      const field = (
        <div>
          <input 
            type="password" 
            aria-describedby="password-requirements"
          />
          <span id="password-requirements">
            Must be at least 8 characters
          </span>
        </div>
      );

      const { getByText } = render(field);
      const description = getByText('Must be at least 8 characters');
      expect(description).toHaveAttribute('id', 'password-requirements');
    });
  });

  describe('ARIA Roles', () => {
    it('should use appropriate landmark roles', () => {
      const landmarks = [
        { element: 'header', role: 'banner' },
        { element: 'nav', role: 'navigation' },
        { element: 'main', role: 'main' },
        { element: 'footer', role: 'contentinfo' },
      ];

      expect(landmarks).toHaveLength(4);
      expect(landmarks[0].role).toBe('banner');
    });

    it('should use role="alert" for important messages', () => {
      const alert = <div role="alert">Error: Please try again</div>;
      const { getByRole } = render(alert);
      
      const alertElement = getByRole('alert');
      expect(alertElement).toBeInTheDocument();
    });

    it('should use role="status" for status updates', () => {
      const status = <div role="status">Loading...</div>;
      const { getByRole } = render(status);
      
      const statusElement = getByRole('status');
      expect(statusElement).toBeInTheDocument();
    });

    it('should use role="dialog" for modal dialogs', () => {
      const dialog = (
        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h2 id="dialog-title">Confirm Action</h2>
        </div>
      );

      const { getByRole } = render(dialog);
      const dialogElement = getByRole('dialog');
      expect(dialogElement).toBeInTheDocument();
    });
  });

  describe('ARIA States', () => {
    it('should use aria-expanded for collapsible elements', () => {
      const button = <button aria-expanded="false">Show more</button>;
      const { getByRole } = render(button);
      
      const expandButton = getByRole('button');
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should use aria-checked for custom checkboxes', () => {
      const checkbox = (
        <div role="checkbox" aria-checked="true">
          Agree to terms
        </div>
      );

      const { getByRole } = render(checkbox);
      const checkboxElement = getByRole('checkbox');
      expect(checkboxElement).toHaveAttribute('aria-checked', 'true');
    });

    it('should use aria-selected for selected items', () => {
      const tab = (
        <button role="tab" aria-selected="true">
          Dashboard
        </button>
      );

      const { getByRole } = render(tab);
      const tabElement = getByRole('tab');
      expect(tabElement).toHaveAttribute('aria-selected', 'true');
    });

    it('should use aria-disabled for disabled elements', () => {
      const button = <button aria-disabled="true">Submit</button>;
      const { getByRole } = render(button);
      
      const disabledButton = getByRole('button');
      expect(disabledButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('ARIA Live Regions', () => {
    it('should use aria-live for dynamic content', () => {
      const liveRegion = (
        <div aria-live="polite" aria-atomic="true">
          3 new orders received
        </div>
      );

      const { getByText } = render(liveRegion);
      const region = getByText('3 new orders received');
      expect(region.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    });

    it('should use aria-live="assertive" for urgent messages', () => {
      const urgentRegion = (
        <div aria-live="assertive">
          Error: Connection lost
        </div>
      );

      const { getByText } = render(urgentRegion);
      const region = getByText('Error: Connection lost');
      expect(region.closest('[aria-live]')).toHaveAttribute('aria-live', 'assertive');
    });

    it('should use aria-atomic for complete announcements', () => {
      const atomicRegion = (
        <div aria-live="polite" aria-atomic="true">
          <span>Page</span> <span>1</span> <span>of</span> <span>10</span>
        </div>
      );

      const { getByText } = render(atomicRegion);
      const region = getByText('Page');
      expect(region.closest('[aria-atomic]')).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Form Accessibility', () => {
    it('should associate labels with inputs', () => {
      const field = (
        <div>
          <label htmlFor="email-input">Email Address</label>
          <input id="email-input" type="email" />
        </div>
      );

      const { getByLabelText } = render(field);
      const input = getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
    });

    it('should mark required fields with aria-required', () => {
      const requiredField = (
        <input type="text" aria-required="true" placeholder="Name" />
      );

      const { getByPlaceholderText } = render(requiredField);
      const input = getByPlaceholderText('Name');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should use aria-invalid for validation errors', () => {
      const invalidField = (
        <input 
          type="email" 
          aria-invalid="true" 
          aria-describedby="email-error"
          placeholder="Email"
        />
      );

      const { getByPlaceholderText } = render(invalidField);
      const input = getByPlaceholderText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should group related inputs with fieldset and legend', () => {
      const fieldset = (
        <fieldset>
          <legend>Contact Information</legend>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
        </fieldset>
      );

      const { getByText } = render(fieldset);
      const legend = getByText('Contact Information');
      expect(legend.tagName).toBe('LEGEND');
    });
  });

  describe('Navigation Accessibility', () => {
    it('should use aria-current for current page', () => {
      const nav = (
        <nav>
          <a href="/dashboard" aria-current="page">Dashboard</a>
          <a href="/orders">Orders</a>
        </nav>
      );

      const { getByText } = render(nav);
      const currentLink = getByText('Dashboard');
      expect(currentLink).toHaveAttribute('aria-current', 'page');
    });

    it('should use aria-label for multiple nav elements', () => {
      const navigation = {
        main: <nav aria-label="Main navigation">Primary menu</nav>,
        footer: <nav aria-label="Footer navigation">Footer menu</nav>,
      };

      const { getByLabelText } = render(navigation.main);
      const mainNav = getByLabelText('Main navigation');
      expect(mainNav).toBeInTheDocument();
    });
  });

  describe('Table Accessibility', () => {
    it('should use proper table structure with headers', () => {
      const table = (
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Widget</td>
              <td>$10</td>
            </tr>
          </tbody>
        </table>
      );

      const { getByText } = render(table);
      const header = getByText('Product');
      expect(header.tagName).toBe('TH');
    });

    it('should use aria-label for table caption', () => {
      const table = (
        <table aria-label="Order summary">
          <tbody>
            <tr><td>Item 1</td></tr>
          </tbody>
        </table>
      );

      const { getByLabelText } = render(table);
      const tableElement = getByLabelText('Order summary');
      expect(tableElement).toBeInTheDocument();
    });
  });

  describe('Image Accessibility', () => {
    it('should have alt text for informative images', () => {
      const image = <img src="logo.png" alt="Company Logo" />;
      const { getByAltText } = render(image);
      
      const img = getByAltText('Company Logo');
      expect(img).toBeInTheDocument();
    });

    it('should have empty alt for decorative images', () => {
      const image = <img src="decoration.png" alt="" />;
      const { getByRole } = render(image);
      
      const img = getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('alt', '');
    });

    it('should use aria-hidden for purely decorative elements', () => {
      const decorative = <span aria-hidden="true">★</span>;
      const { getByText } = render(decorative);
      
      const element = getByText('★');
      expect(element).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
