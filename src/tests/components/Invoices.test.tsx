import { render, screen, fireEvent, within } from "@testing-library/react";
import WMSInvoices from "@/pages/warehouse/Invoices";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { supabase } from "@/integrations/supabase/client";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Mock hooks and external dependencies
vi.mock("@/hooks/useWMSCustomer");
vi.mock("@/integrations/supabase/client");

const queryClient = new QueryClient();

const Wrapper = ({ children }) => (
  <MemoryRouter>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </MemoryRouter>
);

describe("WMSInvoices", () => {
  it("renders the tax percentage as 0% when subtotal is 0", async () => {
    // Mock the useWMSCustomer hook to return a customer
    vi.mocked(useWMSCustomer).mockReturnValue({
      data: { id: "123" },
      isLoading: false,
    });

    // Mock the supabase query to return an invoice with a subtotal of 0
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "inv_1",
            invoice_number: "INV-001",
            invoice_date: "2023-10-26",
            due_date: "2023-11-25",
            subtotal: 0,
            tax_amount: 0,
            total_amount: 0,
            status: "paid",
            paid_at: "2023-10-26",
            order: {
              order_items: [],
            },
          },
        ],
        error: null,
      }),
    } as any);

    render(
      <Wrapper>
        <WMSInvoices />
      </Wrapper>
    );

    // Find the row and then the button within it
    const row = await screen.findByRole("row", { name: /INV-001/i });
    const viewButton = within(row).getByRole("button", { name: /view/i });
    fireEvent.click(viewButton);

    // Check that the tax percentage is displayed as 0%
    const taxPercentage = await screen.findByText(/Tax \(0%\)/i);
    expect(taxPercentage).toBeInTheDocument();
  });
});
