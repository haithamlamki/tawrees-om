import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createInAppNotification } from "@/utils/notificationUtils";
import { Package, MapPin, User, Calendar, DollarSign, Plus, X } from "lucide-react";
import { ItemDetailsViewer } from "@/components/admin/ItemDetailsViewer";
import { ShipmentItem } from "@/types/calculator";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface StorageLocation {
  id: string;
  name: string;
  address: string;
  is_default: boolean;
}

interface DocumentRequest {
  id: string;
  document_type: string;
  description: string;
  is_required: boolean;
}

const DOCUMENT_TYPES = [
  "Commercial Invoice",
  "Packing List",
  "Bill of Lading",
  "Certificate of Origin",
  "Product Certificate",
  "Insurance Certificate",
  "Supplier Invoice",
  "Custom Documents",
  "Other (Specify)",
];

interface OrderReviewDialogProps {
  shipmentId: string;
  requestId: string;
  trackingNumber: string;
  customerName: string;
  customerId: string;
  deliveryAddress: string;
  estimatedDelivery: string;
  estimatedAmount: number;
  currency: string;
  partnerId: string;
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
  currency,
  partnerId,
  items,
  open,
  onOpenChange,
  onSuccess,
}: OrderReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [quotedAmount, setQuotedAmount] = useState(estimatedAmount.toString());
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [savedLocations, setSavedLocations] = useState<StorageLocation[]>([]);
  const [showNewLocationInput, setShowNewLocationInput] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("45");
  const [shippingRoute, setShippingRoute] = useState("");
  const [handlingFees, setHandlingFees] = useState("");
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
  const [newDocType, setNewDocType] = useState("");
  const [newDocTypeOther, setNewDocTypeOther] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");

  // Fetch saved storage locations
  useEffect(() => {
    if (open && partnerId) {
      fetchStorageLocations();
    }
  }, [open, partnerId]);

  const fetchStorageLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_partners")
        .select("storage_locations")
        .eq("id", partnerId)
        .single();

      if (error) throw error;

      const locations = Array.isArray(data?.storage_locations) 
        ? data.storage_locations as unknown as StorageLocation[]
        : [];
      setSavedLocations(locations);

      // Set default location if exists
      const defaultLocation = locations.find((loc) => loc.is_default);
      if (defaultLocation) {
        setStorageLocation(defaultLocation.name);
      }
    } catch (error) {
      console.error("Error fetching storage locations:", error);
    }
  };

  const handleSaveNewLocation = async () => {
    if (!newLocationName.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    try {
      const newLocation: StorageLocation = {
        id: Math.random().toString(36).substr(2, 9),
        name: newLocationName.trim(),
        address: "",
        is_default: savedLocations.length === 0,
      };

      const updatedLocations = [...savedLocations, newLocation];

      const { error } = await supabase
        .from("shipping_partners")
        .update({ storage_locations: updatedLocations as any })
        .eq("id", partnerId);

      if (error) throw error;

      setSavedLocations(updatedLocations);
      setStorageLocation(newLocation.name);
      setNewLocationName("");
      setShowNewLocationInput(false);
      toast.success("Storage location saved");
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  const addDocumentRequest = () => {
    const docType = newDocType === "Other (Specify)" ? newDocTypeOther : newDocType;
    
    if (!docType.trim()) {
      toast.error("Please select or enter document type");
      return;
    }
    
    setDocumentRequests([
      ...documentRequests,
      {
        id: Math.random().toString(),
        document_type: docType,
        description: newDocDescription,
        is_required: true,
      },
    ]);
    setNewDocType("");
    setNewDocTypeOther("");
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

    // Determine if customer approval is needed
    const requiresApproval = hasAdjustment || documentRequests.length > 0;
    const newStatus = requiresApproval ? "pending_customer_approval" : "in_transit";

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
          currency: currency,
          requires_customer_approval: requiresApproval,
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
          status: newStatus,
          partner_quote_id: quoteData.id,
        })
        .eq("id", shipmentId);

      if (shipmentError) throw shipmentError;

      // 4. Notify customer only if approval needed
      if (requiresApproval) {
        await createInAppNotification(
          customerId,
          "Shipping Quote Ready",
          `Your shipping partner has submitted a quote for order ${trackingNumber}. Please review and approve.`,
          "quote",
          quoteData.id
        );
        toast.success("Quote submitted for customer approval!");
      } else {
        toast.success("Order accepted and processing! No customer approval required.");
      }

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
  const currencySymbol = currency === "USD" ? "$" : currency;

  const formatAmount = (amount: number) => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`;
    }
    return `${currency} ${amount.toFixed(3)}`;
  };

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
                    {formatAmount(estimatedAmount)}
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
              <Label htmlFor="quotedAmount">Quoted Amount ({currencySymbol}) *</Label>
              <Input
                id="quotedAmount"
                type="number"
                step={currency === "USD" ? "0.01" : "0.001"}
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                placeholder="Enter your quoted amount"
              />
              {hasAdjustment && (
                <Badge variant={amountDifference > 0 ? "destructive" : "default"}>
                  {amountDifference > 0 ? "+" : ""}
                  {formatAmount(Math.abs(amountDifference))} from estimate
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
              {!showNewLocationInput ? (
                <div className="space-y-2">
                  <Select value={storageLocation} onValueChange={(value) => {
                    if (value === "__add_new__") {
                      setShowNewLocationInput(true);
                      setStorageLocation("");
                    } else {
                      setStorageLocation(value);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select storage location" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name} {loc.is_default && "(Default)"}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__">+ Add New Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Enter new storage location"
                  />
                  <Button onClick={handleSaveNewLocation} size="sm">
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowNewLocationInput(false);
                      setNewLocationName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
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
              <Select value={newDocType} onValueChange={setNewDocType}>
                <SelectTrigger id="newDocType">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newDocType === "Other (Specify)" && (
              <div className="space-y-2">
                <Label htmlFor="newDocTypeOther">Specify Document Type</Label>
                <Input
                  id="newDocTypeOther"
                  value={newDocTypeOther}
                  onChange={(e) => setNewDocTypeOther(e.target.value)}
                  placeholder="Enter custom document type"
                />
              </div>
            )}

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