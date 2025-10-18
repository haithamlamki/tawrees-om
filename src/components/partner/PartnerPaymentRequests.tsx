import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Bell } from "lucide-react";
import { toast } from "sonner";
import { PartnerPaymentConfirmation } from "./PartnerPaymentConfirmation";

interface PartnerPayment {
  id: string;
  payment_reference: string;
  total_amount: number;
  currency: string;
  payment_date: string;
  status: string;
  payment_slip_path: string | null;
  notes: string | null;
  created_at: string;
}

interface PaymentInvoice {
  id: string;
  invoice_amount: number;
  shipments: {
    tracking_number: string;
    shipment_requests: {
      profiles: {
        full_name: string;
      };
    };
  };
}

export const PartnerPaymentRequests = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PartnerPayment | null>(null);
  const [paymentInvoices, setPaymentInvoices] = useState<PaymentInvoice[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string>("");

  useEffect(() => {
    loadPartnerPayments();
  }, []);

  const loadPartnerPayments = async () => {
    try {
      setLoading(true);

      // Get partner ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("shipping_partner_id")
        .eq("user_id", user.id)
        .eq("role", "shipping_partner")
        .single();

      if (!roles?.shipping_partner_id) throw new Error("Partner ID not found");
      setPartnerId(roles.shipping_partner_id);

      // Load payments
      const { data, error } = await supabase
        .from('partner_payments')
        .select('*')
        .eq('partner_id', roles.shipping_partner_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Error loading payments:", error);
      toast.error("Failed to load payment requests");
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
      toast.error("Failed to load payment details");
    }
  };

  const handleConfirmPayment = async (payment: PartnerPayment) => {
    setSelectedPayment(payment);
    await loadPaymentInvoices(payment.id);
    setConfirmDialogOpen(true);
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

  const pendingPayments = payments.filter(p => p.status === 'pending_confirmation');
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');

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
    <div className="space-y-6">
      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Pending Payment Confirmations
            </CardTitle>
            <CardDescription>
              Review and confirm receipt of payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono font-semibold">
                        {payment.payment_reference}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">
                        {payment.currency} {payment.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleConfirmPayment(payment)}
                          size="sm"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            View all confirmed payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmedPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payment history</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confirmed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        {payment.payment_reference}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {payment.currency} {payment.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {selectedPayment && (
        <PartnerPaymentConfirmation
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          paymentId={selectedPayment.id}
          paymentReference={selectedPayment.payment_reference}
          totalAmount={selectedPayment.total_amount}
          currency={selectedPayment.currency}
          paymentSlipPath={selectedPayment.payment_slip_path}
          adminNotes={selectedPayment.notes}
          invoices={paymentInvoices}
          onSuccess={loadPartnerPayments}
        />
      )}
    </div>
  );
};