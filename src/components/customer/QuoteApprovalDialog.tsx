import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createInAppNotification } from "@/utils/notificationUtils";
import { 
  DollarSign, 
  MapPin, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle,
  Upload,
  Package
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DocumentRequest {
  id: string;
  document_type: string;
  description: string | null;
  is_required: boolean;
  status: string;
  uploaded_file_path: string | null;
}

interface QuoteDetails {
  id: string;
  original_amount: number;
  partner_quoted_amount: number;
  adjustment_reason: string | null;
  storage_location: string | null;
  estimated_delivery_days: number | null;
  shipping_details: any;
  status: string;
  submitted_at: string;
}

interface QuoteApprovalDialogProps {
  quoteId: string;
  shipmentId: string;
  trackingNumber: string;
  partnerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuoteApprovalDialog({
  quoteId,
  shipmentId,
  trackingNumber,
  partnerId,
  open,
  onOpenChange,
  onSuccess,
}: QuoteApprovalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  // Load quote and document requests
  useState(() => {
    if (open && quoteId) {
      loadQuoteDetails();
    }
  });

  const loadQuoteDetails = async () => {
    try {
      // Fetch quote
      const { data: quoteData, error: quoteError } = await supabase
        .from("partner_shipping_quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (quoteError) throw quoteError;
      setQuote(quoteData);

      // Fetch document requests
      const { data: docsData, error: docsError } = await supabase
        .from("partner_document_requests")
        .select("*")
        .eq("quote_id", quoteId);

      if (docsError) throw docsError;
      setDocumentRequests(docsData || []);
    } catch (error: any) {
      console.error("Error loading quote:", error);
      toast.error("Failed to load quote details");
    }
  };

  const handleFileUpload = async (docRequestId: string, file: File) => {
    setUploading(docRequestId);
    try {
      const filePath = `quote-documents/${quoteId}/${docRequestId}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("shipment-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update document request
      const { error: updateError } = await supabase
        .from("partner_document_requests")
        .update({
          uploaded_file_path: filePath,
          uploaded_at: new Date().toISOString(),
          status: "uploaded",
        })
        .eq("id", docRequestId);

      if (updateError) throw updateError;

      toast.success("Document uploaded successfully");
      loadQuoteDetails();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(null);
    }
  };

  const handleApprove = async () => {
    if (!quote) return;

    // Check if all required documents are uploaded
    const missingDocs = documentRequests.filter(
      (doc) => doc.is_required && doc.status === "pending"
    );

    if (missingDocs.length > 0) {
      toast.error("Please upload all required documents before approving");
      return;
    }

    setLoading(true);
    try {
      // Update quote status
      const { error: quoteError } = await supabase
        .from("partner_shipping_quotes")
        .update({
          status: "customer_approved",
          customer_notes: customerNotes,
          customer_responded_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (quoteError) throw quoteError;

      // Update shipment
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({
          status: "in_transit",
          final_agreed_amount: quote.partner_quoted_amount,
          customer_approved_quote_at: new Date().toISOString(),
        })
        .eq("id", shipmentId);

      if (shipmentError) throw shipmentError;

      // Notify partner
      const { data: partnerUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("shipping_partner_id", partnerId)
        .eq("role", "shipping_partner");

      if (partnerUsers && partnerUsers.length > 0) {
        for (const partnerUser of partnerUsers) {
          await createInAppNotification(
            partnerUser.user_id,
            "Quote Approved",
            `Customer approved your quote for order ${trackingNumber}. You can now proceed with delivery.`,
            "quote",
            quoteId
          );
        }
      }

      toast.success("Quote approved! The shipment is now in transit.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error approving quote:", error);
      toast.error("Failed to approve quote");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!customerNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    try {
      // Update quote status
      const { error: quoteError } = await supabase
        .from("partner_shipping_quotes")
        .update({
          status: "customer_rejected",
          customer_notes: customerNotes,
          customer_responded_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (quoteError) throw quoteError;

      // Revert shipment to pending_partner_acceptance
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({
          status: "pending_partner_acceptance",
        })
        .eq("id", shipmentId);

      if (shipmentError) throw shipmentError;

      // Notify partner
      const { data: partnerUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("shipping_partner_id", partnerId)
        .eq("role", "shipping_partner");

      if (partnerUsers && partnerUsers.length > 0) {
        for (const partnerUser of partnerUsers) {
          await createInAppNotification(
            partnerUser.user_id,
            "Quote Rejected",
            `Customer rejected your quote for order ${trackingNumber}. Please review and submit a new quote.`,
            "quote",
            quoteId
          );
        }
      }

      toast.success("Quote rejected. Partner will be notified to submit a new quote.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error rejecting quote:", error);
      toast.error("Failed to reject quote");
    } finally {
      setLoading(false);
    }
  };

  if (!quote) {
    return null;
  }

  const amountDifference = quote.partner_quoted_amount - quote.original_amount;
  const hasAdjustment = Math.abs(amountDifference) > 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Shipping Quote - {trackingNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Original Estimate</p>
                  <p className="text-2xl font-semibold">OMR {quote.original_amount.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Partner Quote</p>
                  <p className="text-2xl font-semibold text-primary">
                    OMR {quote.partner_quoted_amount.toFixed(3)}
                  </p>
                  {hasAdjustment && (
                    <Badge variant={amountDifference > 0 ? "destructive" : "default"} className="mt-1">
                      {amountDifference > 0 ? "+" : ""}
                      {amountDifference.toFixed(3)} OMR
                    </Badge>
                  )}
                </div>
              </div>

              {hasAdjustment && quote.adjustment_reason && (
                <div className="pt-2">
                  <p className="text-sm font-medium">Adjustment Reason:</p>
                  <p className="text-sm text-muted-foreground">{quote.adjustment_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.storage_location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Storage Location</p>
                    <p className="text-sm text-muted-foreground">{quote.storage_location}</p>
                  </div>
                </div>
              )}

              {quote.estimated_delivery_days && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Estimated Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      {quote.estimated_delivery_days} days
                    </p>
                  </div>
                </div>
              )}

              {quote.shipping_details?.route && (
                <div className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Shipping Route</p>
                    <p className="text-sm text-muted-foreground">{quote.shipping_details.route}</p>
                  </div>
                </div>
              )}

              {quote.shipping_details?.handling_fees && (
                <div className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Handling Fees</p>
                    <p className="text-sm text-muted-foreground">
                      {quote.shipping_details.handling_fees}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Requests */}
          {documentRequests.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Required Documents</h3>
                </div>

                {documentRequests.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{doc.document_type}</p>
                            {doc.is_required && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                            {doc.status === "uploaded" && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Uploaded
                              </Badge>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                          )}
                        </div>

                        {doc.status === "pending" && (
                          <div>
                            <Input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.id, file);
                              }}
                              disabled={uploading === doc.id}
                              className="max-w-xs"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <Separator />

          {/* Customer Notes */}
          <div className="space-y-2">
            <Label htmlFor="customerNotes">Your Notes / Comments</Label>
            <Textarea
              id="customerNotes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Add any questions or comments about this quote"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Quote
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading ? "Processing..." : "Approve Quote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
