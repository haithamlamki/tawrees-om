import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, DollarSign, FileText, Download } from "lucide-react";
import { toast } from "sonner";

interface PartnerPayment {
  id: string;
  payment_reference: string;
  partner_id: string;
  total_amount: number;
  currency: string;
  payment_slip_path: string | null;
  payment_date: string;
  status: string;
  notes: string | null;
  partner_notes: string | null;
  confirmed_at: string | null;
  created_at: string;
  shipping_partners: {
    company_name: string;
  };
}

interface PaymentInvoice {
  id: string;
  invoice_amount: number;
  shipments: {
    tracking_number: string;
    status: string;
    shipment_requests: {
      profiles: {
        full_name: string;
      };
    };
  };
}

export const PartnerPaymentsList = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PartnerPayment | null>(null);
  const [paymentInvoices, setPaymentInvoices] = useState<PaymentInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partner_payments')
        .select(`
          *,
          shipping_partners (
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Error loading payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentInvoices = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('partner_payment_invoices')
        .select(`
          *,
          shipments (
            tracking_number,
            status,
            shipment_requests (
              profiles (
                full_name
              )
            )
          )
        `)
        .eq('payment_id', paymentId);

      if (error) throw error;
      setPaymentInvoices(data || []);
    } catch (error: any) {
      console.error("Error loading payment invoices:", error);
      toast.error("Failed to load payment invoices");
    }
  };

  const downloadPaymentSlip = async (path: string, reference: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('partner-payment-slips')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-slip-${reference}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading payment slip:", error);
      toast.error("Failed to download payment slip");
    }
  };

  const handleViewDetails = async (payment: PartnerPayment) => {
    setSelectedPayment(payment);
    await loadPaymentInvoices(payment.id);
    setSheetOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending_confirmation: "secondary",
      confirmed: "default",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.payment_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.shipping_partners.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Partner Payments History
          </CardTitle>
          <CardDescription>
            View and manage all partner payment requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by payment reference or partner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_confirmation">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payment records found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono font-semibold">
                        {payment.payment_reference}
                      </TableCell>
                      <TableCell>{payment.shipping_partners.company_name}</TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {payment.currency} {payment.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {payment.confirmed_at
                          ? new Date(payment.confirmed_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(payment)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedPayment && (
            <>
              <SheetHeader>
                <SheetTitle>Payment Details</SheetTitle>
                <SheetDescription>
                  {selectedPayment.payment_reference}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Payment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Partner</p>
                        <p className="font-medium">{selectedPayment.shipping_partners.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        {getStatusBadge(selectedPayment.status)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Date</p>
                        <p className="font-medium">
                          {new Date(selectedPayment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-bold text-lg text-primary">
                          {selectedPayment.currency} {selectedPayment.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {selectedPayment.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Admin Notes</p>
                        <p className="mt-1">{selectedPayment.notes}</p>
                      </div>
                    )}
                    {selectedPayment.partner_notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Partner Notes</p>
                        <p className="mt-1">{selectedPayment.partner_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Slip */}
                {selectedPayment.payment_slip_path && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Slip</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => downloadPaymentSlip(
                          selectedPayment.payment_slip_path!,
                          selectedPayment.payment_reference
                        )}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Payment Slip
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Included Invoices */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Included Invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tracking #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-mono text-xs">
                                {invoice.shipments.tracking_number}
                              </TableCell>
                              <TableCell>
                                {invoice.shipments.shipment_requests?.profiles?.full_name || 'Unknown'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${invoice.invoice_amount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};