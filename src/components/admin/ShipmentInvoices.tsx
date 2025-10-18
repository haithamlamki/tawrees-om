import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InvoiceData {
  id: string;
  tracking_number: string;
  customer_name: string;
  created_at: string;
  status: string;
  total_amount: number;
  cost_amount: number;
  profit: number;
  tawreed_amount: number;
  partner_amount: number;
  partner_name: string | null;
}

interface ShipmentInvoicesProps {
  partnerId?: string; // If provided, filter by partner
  isAdmin?: boolean;
}

export const ShipmentInvoices = ({ partnerId, isAdmin = false }: ShipmentInvoicesProps) => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);

  useEffect(() => {
    loadInvoices();
  }, [partnerId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_shipment_invoices_for_user', {
        p_partner_id: partnerId || null
      });

      if (error) {
        console.error('Error loading shipment invoices:', error);
        toast.error('Failed to load shipment invoices');
        return;
      }

      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const getTotals = () => {
    return invoices.reduce(
      (acc, invoice) => ({
        total: acc.total + invoice.total_amount,
        cost: acc.cost + invoice.cost_amount,
        profit: acc.profit + invoice.profit,
        tawreed: acc.tawreed + invoice.tawreed_amount,
        partner: acc.partner + invoice.partner_amount,
      }),
      { total: 0, cost: 0, profit: 0, tawreed: 0, partner: 0 }
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totals = getTotals();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shipment Invoices
          </CardTitle>
          <CardDescription>
            {partnerId ? "Partner earnings breakdown" : "Revenue breakdown by shipment"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No completed shipments</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Customer</TableHead>
                      {isAdmin && <TableHead>Partner</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Cost Amount</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Tawreed Amount</TableHead>
                      <TableHead className="text-right">Partner Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs">
                          {invoice.tracking_number}
                        </TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            {invoice.partner_name || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === "completed" ? "default" : "secondary"}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${invoice.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${invoice.cost_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${invoice.profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          ${invoice.tawreed_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          ${invoice.partner_amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={isAdmin ? 5 : 4}>TOTALS</TableCell>
                      <TableCell className="text-right">${totals.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        ${totals.profit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        ${totals.tawreed.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        ${totals.partner.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-5 gap-4 mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl">${totals.total.toFixed(2)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Cost</CardDescription>
                    <CardTitle className="text-2xl text-muted-foreground">
                      ${totals.cost.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Profit</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      ${totals.profit.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Tawreed Share</CardDescription>
                    <CardTitle className="text-2xl text-primary">
                      ${totals.tawreed.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Partner Share</CardDescription>
                    <CardTitle className="text-2xl text-blue-600">
                      ${totals.partner.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
