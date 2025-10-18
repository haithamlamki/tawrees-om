import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createInAppNotification } from "@/utils/notificationUtils";
import { Package, MapPin, User, Calendar, DollarSign, Plus, X } from "lucide-react";
import { ItemDetailsViewer } from "@/components/admin/ItemDetailsViewer";
import { ShipmentItem } from "@/types/calculator";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface DocumentRequest {
  id: string;
  document_type: string;
  description: string;
  is_required: boolean;
}

interface OrderReviewDialogProps {
  shipmentId: string;
  requestId: string;
  trackingNumber: string;
  customerName: string;
  customerId: string;
  deliveryAddress: string;
  estimatedDelivery: string;
  estimatedAmount: number;
  items: ShipmentItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OrderReviewDialog({
  shipmentId,
  requestId,
  trackingNumber,
  customerName,
  customerId,
  deliveryAddress,
  estimatedDelivery,
  estimatedAmount,
  items,
  open,
  onOpenChange,
  onSuccess,
}: OrderReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [quotedAmount, setQuotedAmount] = useState(estimatedAmount.toString());
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [shippingRoute, setShippingRoute] = useState("");
  const [handlingFees, setHandlingFees] = useState("");
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [newDocType, setNewDocType] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");

  const addDocumentRequest = () => {
    if (!newDocType.trim()) {
      toast.error("Please enter document type");
      return;
    }
    
    setDocumentRequests([
      ...documentRequests,
      {
        id: Math.random().toString(),
        document_type: newDocType,
        description: newDocDescription,
        is_required: true,
      },
    ]);
    setNewDocType("");
    setNewDocDescription("");
  };

  const removeDocumentRequest = (id: string) => {
    setDocumentRequests(documentRequests.filter((doc) => doc.id !== id));
  };

  const handleSubmitQuote = async () => {
    if (!quotedAmount || isNaN(parseFloat(quotedAmount))) {
      toast.error("Please enter a valid quoted amount");
      return;
    }

    if (!storageLocation.trim()) {
      toast.error("Please specify storage location");
      return;
    }

    const quotedAmountNum = parseFloat(quotedAmount);
    const hasAdjustment = Math.abs(quotedAmountNum - estimatedAmount) > 0.01;

    if (hasAdjustment && !adjustmentReason.trim()) {
      toast.error("Please provide a reason for the amount adjustment");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create shipping details object
      const shippingDetails = {
        route: shippingRoute,
        handling_fees: handlingFees,
      };

      // 1. Create partner quote
      const { data: quoteData, error: quoteError } = await supabase
        .from("partner_shipping_quotes")
        .insert({
          shipment_id: shipmentId,
          original_amount: estimatedAmount,
          partner_quoted_amount: quotedAmountNum,
          adjustment_reason: hasAdjustment ? adjustmentReason : null,
          storage_location: storageLocation,
          estimated_delivery_days: estimatedDays ? parseInt(estimatedDays) : null,
          shipping_details: shippingDetails,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          partner_user_id: user.id,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // 2. Create document requests if any
      if (documentRequests.length > 0) {
        const docRequestsToInsert = documentRequests.map((doc) => ({
          quote_id: quoteData.id,
          document_type: doc.document_type,
          description: doc.description,
          is_required: doc.is_required,
          status: "pending" as const,
        }));

        const { error: docError } = await supabase
          .from("partner_document_requests")
          .insert(docRequestsToInsert);

        if (docError) throw docError;
      }

      // 3. Update shipment status and link to quote
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({
          status: "pending_customer_approval",
          partner_quote_id: quoteData.id,
        })
        .eq("id", shipmentId);

      if (shipmentError) throw shipmentError;

      // 4. Notify customer
      await createInAppNotification(
        customerId,
        "Shipping Quote Ready",
        `Your shipping partner has submitted a quote for order ${trackingNumber}. Please review and approve.`,
        "quote",
        quoteData.id
      );

      toast.success("Quote submitted successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting quote:", error);
      toast.error(error.message || "Failed to submit quote");
    } finally {
      setLoading(false);
    }
  };

  const amountDifference = parseFloat(quotedAmount || "0") - estimatedAmount;
  const hasAdjustment = Math.abs(amountDifference) > 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Submit Quote - {trackingNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Customer</p>
                  <p className="text-sm text-muted-foreground">{customerName}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Delivery Address</p>
                  <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                    {deliveryAddress || "No address provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Requested Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Estimated Amount</p>
                  <p className="text-lg font-semibold text-primary">
                    OMR {estimatedAmount.toFixed(3)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Details */}
          {items && items.length > 0 && (
            <ItemDetailsViewer items={items} shippingType="sea" compact={true} />
          )}

          <Separator />

          {/* Quote Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Quote Details</h3>

            {/* Quoted Amount */}
            <div className="space-y-2">
              <Label htmlFor="quotedAmount">Quoted Amount (OMR) *</Label>
              <Input
                id="quotedAmount"
                type="number"
                step="0.001"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                placeholder="Enter your quoted amount"
              />
              {hasAdjustment && (
                <Badge variant={amountDifference > 0 ? "destructive" : "default"}>
                  {amountDifference > 0 ? "+" : ""}
                  {amountDifference.toFixed(3)} OMR from estimate
                </Badge>
              )}
            </div>

            {/* Adjustment Reason (shown if amount differs) */}
            {hasAdjustment && (
              <div className="space-y-2">
                <Label htmlFor="adjustmentReason">Reason for Adjustment *</Label>
                <Textarea
                  id="adjustmentReason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explain why the quoted amount differs from the estimate (e.g., additional handling, fuel costs, storage fees)"
                  rows={3}
                />
              </div>
            )}

            {/* Storage Location */}
            <div className="space-y-2">
              <Label htmlFor="storageLocation">Storage/Warehouse Location *</Label>
              <Input
                id="storageLocation"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="e.g., Warehouse A, Zone 3, Muscat Industrial Area"
              />
            </div>

            {/* Estimated Delivery Days */}
            <div className="space-y-2">
              <Label htmlFor="estimatedDays">Estimated Delivery Days</Label>
              <Input
                id="estimatedDays"
                type="number"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
                placeholder="Number of days to deliver"
              />
            </div>

            {/* Shipping Route */}
            <div className="space-y-2">
              <Label htmlFor="shippingRoute">Shipping Route/Plan</Label>
              <Textarea
                id="shippingRoute"
                value={shippingRoute}
                onChange={(e) => setShippingRoute(e.target.value)}
                placeholder="Describe the shipping route and any transit points"
                rows={2}
              />
            </div>

            {/* Handling Fees */}
            <div className="space-y-2">
              <Label htmlFor="handlingFees">Handling Fees Details</Label>
              <Textarea
                id="handlingFees"
                value={handlingFees}
                onChange={(e) => setHandlingFees(e.target.value)}
                placeholder="Breakdown of handling, loading, or additional fees"
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Document Requests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Request Supplier Documents</h3>
            <p className="text-sm text-muted-foreground">
              Ask the customer to provide specific supplier documents (optional)
            </p>

            {documentRequests.length > 0 && (
              <div className="space-y-2">
                {documentRequests.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{doc.document_type}</p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocumentRequest(doc.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newDocType">Document Type</Label>
              <Input
                id="newDocType"
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                placeholder="e.g., Supplier Invoice, Product Certificate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newDocDescription">Description</Label>
              <Input
                id="newDocDescription"
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                placeholder="Additional details about this document"
              />
            </div>

            <Button variant="outline" onClick={addDocumentRequest} type="button">
              <Plus className="h-4 w-4 mr-2" />
              Add Document Request
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmitQuote} disabled={loading}>
              {loading ? "Submitting..." : "Submit Quote to Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
