import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Loader2, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerPaymentDialog } from "./PartnerPaymentDialog";
import { getPaymentStatusBadgeVariant, getPaymentStatusLabel, getPaymentStatusClassName } from "@/lib/utils";

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
  partner_id: string | null;
  payment_status: string;
}

interface ShipmentInvoicesProps {
  partnerId?: string; // If provided, filter by partner
  isAdmin?: boolean;
}

export const ShipmentInvoices = ({ partnerId, isAdmin = false }: ShipmentInvoicesProps) => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

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

  const toggleInvoiceSelection = (invoiceId: string) => {
    const invoice = displayedInvoices.find(inv => inv.id === invoiceId);
    if (!invoice?.partner_id) {
      toast.error("Cannot select invoices without an assigned partner");
      return;
    }
    
    // Only allow selecting unpaid invoices
    if (invoice.payment_status !== 'unpaid') {
      toast.error("Can only select unpaid invoices");
      return;
    }
    
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const selectableInvoices = displayedInvoices.filter(inv => inv.partner_id && inv.payment_status === 'unpaid');
    
    if (selectedInvoices.size === selectableInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(selectableInvoices.map(inv => inv.id)));
    }
  };

  const getSelectedTotal = () => {
    return displayedInvoices
      .filter(inv => selectedInvoices.has(inv.id))
      .reduce((sum, inv) => sum + inv.partner_amount, 0);
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

  const displayedInvoices = showUnpaidOnly 
    ? invoices.filter(inv => !inv.partner_name || inv.status !== 'paid')
    : invoices;

  const selectedInvoicesData = displayedInvoices.filter(inv => selectedInvoices.has(inv.id));
  const selectedPartnerIds = new Set(selectedInvoicesData.map(inv => inv.partner_id).filter(Boolean));
  const canProcessPayment = selectedInvoices.size > 0 && selectedPartnerIds.size === 1 && selectedInvoicesData[0]?.partner_id;

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Shipment Invoices
              </CardTitle>
              <CardDescription>
                {partnerId ? "Partner earnings breakdown" : "Revenue breakdown by shipment"}
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
                >
                  {showUnpaidOnly ? "Show All" : "Show Unpaid Only"}
                </Button>
                {selectedInvoices.size > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Selected: </span>
                    <span className="font-semibold">{selectedInvoices.size} invoices</span>
                    <span className="text-muted-foreground"> | Total: </span>
                    <span className="font-bold text-primary">
                      ${getSelectedTotal().toFixed(2)}
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => setPaymentDialogOpen(true)}
                  disabled={!canProcessPayment}
                  size="lg"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Process Payment
                </Button>
              </div>
            )}
          </div>
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
                      {isAdmin && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedInvoices.size === displayedInvoices.filter(inv => inv.partner_id && inv.payment_status === 'unpaid').length && displayedInvoices.filter(inv => inv.partner_id && inv.payment_status === 'unpaid').length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Customer</TableHead>
                      {isAdmin && <TableHead>Partner</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Cost Amount</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Tawreed Amount</TableHead>
                      <TableHead className="text-right">Partner Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        {isAdmin && (
                         <TableCell>
                          <Checkbox
                            checked={selectedInvoices.has(invoice.id)}
                            onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                            disabled={!invoice.partner_id || invoice.payment_status !== 'unpaid'}
                          />
                        </TableCell>
                        )}
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
                        <TableCell>
                          <Badge className={getPaymentStatusClassName(invoice.payment_status)}>
                            {getPaymentStatusLabel(invoice.payment_status)}
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
                      <TableCell colSpan={isAdmin ? 7 : 5}>TOTALS</TableCell>
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

      {/* Payment Dialog */}
      {isAdmin && selectedInvoicesData.length > 0 && (
        <PartnerPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          selectedInvoices={selectedInvoicesData.map(inv => ({
            id: inv.id,
            tracking_number: inv.tracking_number,
            partner_amount: inv.partner_amount,
            customer_name: inv.customer_name,
          }))}
          partnerId={selectedInvoicesData[0]?.partner_id || ''}
          partnerName={selectedInvoicesData[0]?.partner_name || ''}
          onSuccess={() => {
            loadInvoices();
            setSelectedInvoices(new Set());
          }}
        />
      )}
    </div>
  );
};
