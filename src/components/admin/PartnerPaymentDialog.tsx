import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SelectedInvoice {
  id: string;
  tracking_number: string;
  partner_amount: number;
  customer_name: string;
}

interface PartnerPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedInvoices: SelectedInvoice[];
  partnerId: string;
  partnerName: string;
  onSuccess: () => void;
}

export const PartnerPaymentDialog = ({
  open,
  onOpenChange,
  selectedInvoices,
  partnerId,
  partnerName,
  onSuccess,
}: PartnerPaymentDialogProps) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.partner_amount, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload an image (JPG, PNG) or PDF file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setPaymentSlip(file);
    }
  };

  const handleSubmit = async () => {
    if (!paymentSlip) {
      toast.error("Please upload a payment slip");
      return;
    }

    if (selectedInvoices.length === 0) {
      toast.error("No invoices selected");
      return;
    }

    if (!partnerId) {
      toast.error("Cannot process payment for invoices without an assigned partner");
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate payment reference
      const { data: refData, error: refError } = await supabase
        .rpc('generate_payment_reference');
      
      if (refError) throw refError;
      const paymentReference = refData;

      // Upload payment slip with timestamp to avoid conflicts
      const fileExt = paymentSlip.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${paymentReference}_${timestamp}.${fileExt}`;
      const filePath = `${partnerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('partner-payment-slips')
        .upload(filePath, paymentSlip, {
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) throw uploadError;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('partner_payments')
        .insert({
          payment_reference: paymentReference,
          admin_id: user.id,
          partner_id: partnerId,
          total_amount: totalAmount,
          currency: 'OMR',
          payment_slip_path: filePath,
          payment_date: new Date(paymentDate).toISOString(),
          notes: notes || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create payment invoice records
      const invoiceRecords = selectedInvoices.map(inv => ({
        payment_id: payment.id,
        shipment_id: inv.id,
        invoice_amount: inv.partner_amount,
      }));

      const { error: invoicesError } = await supabase
        .from('partner_payment_invoices')
        .insert(invoiceRecords);

      if (invoicesError) throw invoicesError;

      // Update shipment payment status
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          partner_payment_id: payment.id,
          partner_payment_status: 'pending_confirmation',
        })
        .in('id', selectedInvoices.map(inv => inv.id));

      if (updateError) throw updateError;

      // Send notification to partner
      await supabase.functions.invoke('send-partner-payment-notification', {
        body: {
          payment_id: payment.id,
          partner_id: partnerId,
          payment_reference: paymentReference,
          total_amount: totalAmount,
          invoice_count: selectedInvoices.length,
        },
      });

      toast.success("Payment request submitted successfully");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setPaymentSlip(null);
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Partner Payment</DialogTitle>
          <DialogDescription>
            Submit payment for {partnerName} - {selectedInvoices.length} invoice(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <div className="text-2xl font-bold text-primary">
                OMR {totalAmount.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Selected Invoices */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3">Selected Invoices</h4>
              <div className="rounded-md border max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Partner Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs">
                          {invoice.tracking_number}
                        </TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          OMR {invoice.partner_amount.toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        OMR {totalAmount.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Payment Slip Upload */}
          <div className="space-y-2">
            <Label htmlFor="payment-slip">Payment Slip *</Label>
            <div className="flex gap-2">
              <Input
                id="payment-slip"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="flex-1"
              />
              {paymentSlip && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPaymentSlip(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {paymentSlip && (
              <p className="text-sm text-muted-foreground">
                Selected: {paymentSlip.name} ({(paymentSlip.size / 1024).toFixed(2)} KB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Upload bank transfer receipt or payment proof (JPG, PNG, or PDF, max 5MB)
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !paymentSlip}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};