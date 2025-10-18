import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, CheckCircle2 } from "lucide-react";

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

interface PartnerPaymentConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentReference: string;
  totalAmount: number;
  currency: string;
  paymentSlipPath: string | null;
  adminNotes: string | null;
  invoices: PaymentInvoice[];
  onSuccess: () => void;
}

export const PartnerPaymentConfirmation = ({
  open,
  onOpenChange,
  paymentId,
  paymentReference,
  totalAmount,
  currency,
  paymentSlipPath,
  adminNotes,
  invoices,
  onSuccess,
}: PartnerPaymentConfirmationProps) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [partnerNotes, setPartnerNotes] = useState("");

  const downloadPaymentSlip = async () => {
    if (!paymentSlipPath) return;

    try {
      const { data, error } = await supabase.storage
        .from('partner-payment-slips')
        .download(paymentSlipPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-slip-${paymentReference}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading payment slip:", error);
      toast.error("Failed to download payment slip");
    }
  };

  const handleConfirm = async () => {
    if (!confirmed) {
      toast.error("Please confirm receipt of payment");
      return;
    }

    setConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update payment status to confirmed
      const { error: updateError } = await supabase
        .from('partner_payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          partner_notes: partnerNotes || null,
        })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Update all related shipments to paid status
      const shipmentIds = invoices.map(inv => inv.shipments);
      const { error: shipmentsError } = await supabase
        .from('shipments')
        .update({
          partner_payment_status: 'paid',
        })
        .eq('partner_payment_id', paymentId);

      if (shipmentsError) throw shipmentsError;

      toast.success("Payment confirmed successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast.error(error.message || "Failed to confirm payment");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Payment Receipt</DialogTitle>
          <DialogDescription>
            Payment Reference: {paymentReference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Reference</p>
                  <p className="font-mono font-semibold">{paymentReference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    {currency} {totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              {adminNotes && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p className="mt-1">{adminNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Slip */}
          {paymentSlipPath && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-3">Payment Slip</h4>
                <Button
                  onClick={downloadPaymentSlip}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Payment Slip
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Invoice Breakdown */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3">Invoice Breakdown</h4>
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
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs">
                          {invoice.shipments.tracking_number}
                        </TableCell>
                        <TableCell>
                          {invoice.shipments.shipment_requests?.profiles?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {currency} {invoice.invoice_amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {currency} {totalAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                />
                <label
                  htmlFor="confirm"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I confirm receipt of this payment
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partner-notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="partner-notes"
                  placeholder="Add any notes or feedback..."
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirming || !confirmed}>
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};