import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateTrackingNumber } from "@/utils/calculatorUtils";
import { sendNotificationEmail, createInAppNotification } from "@/utils/notificationUtils";
import { ShipmentRequestDetails } from "./ShipmentRequestDetails";
import { Separator } from "@/components/ui/separator";

interface ShipmentApprovalProps {
  requestId: string;
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ShippingPartner {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
}

export function ShipmentApproval({ requestId, customerId, open, onOpenChange, onSuccess }: ShipmentApprovalProps) {
  const [partners, setPartners] = useState<ShippingPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partnerId: "",
    estimatedDelivery: "",
    initialLocation: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadPartners();
    }
  }, [open]);

  const loadPartners = async () => {
    const { data } = await supabase
      .from("shipping_partners")
      .select("*")
      .eq("is_active", true)
      .order("company_name");

    if (data) setPartners(data);
  };

  const handleApprove = async () => {
    if (!formData.partnerId || !formData.estimatedDelivery) {
      toast.error("Please select a partner and estimated delivery date");
      return;
    }

    setLoading(true);
    try {
      // Update request status
      const { error: requestError } = await supabase
        .from("shipment_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Generate tracking number
      const trackingNumber = generateTrackingNumber();

      // Create shipment with pending_partner_acceptance status
      const { data: shipment, error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          request_id: requestId,
          tracking_number: trackingNumber,
          status: "pending_partner_acceptance",
          assigned_partner_id: formData.partnerId,
          estimated_delivery: formData.estimatedDelivery,
          current_location: formData.initialLocation || "Processing",
          notes: formData.notes,
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Get partner details
      const partner = partners.find((p) => p.id === formData.partnerId);

      // Notify customer
      await createInAppNotification(
        customerId,
        "Order Approved",
        `Your order has been approved and assigned to ${partner?.company_name}. Tracking: ${trackingNumber}`,
        "shipment_approved",
        shipment.id
      );

      await sendNotificationEmail({
        recipientUserId: customerId,
        templateType: "order_approved",
        subject: "Your Order Has Been Approved",
        metadata: {
          trackingNumber,
          partnerName: partner?.company_name,
          estimatedDelivery: new Date(formData.estimatedDelivery).toLocaleDateString(),
        },
      });

      // Notify partner
      const { data: partnerUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("shipping_partner_id", formData.partnerId)
        .eq("role", "shipping_partner");

      if (partnerUsers && partnerUsers.length > 0) {
        for (const partnerUser of partnerUsers) {
          await createInAppNotification(
            partnerUser.user_id,
            "New Order Assignment",
            `You have been assigned a new order. Tracking: ${trackingNumber}`,
            "partner_assigned",
            shipment.id
          );
        }
      }

      toast.success("Order approved and partner assigned successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({ partnerId: "", estimatedDelivery: "", initialLocation: "", notes: "" });
    } catch (error: any) {
      console.error("Error approving order:", error);
      toast.error(error.message || "Failed to approve order");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!formData.notes) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("shipment_requests")
        .update({ status: "rejected", notes: formData.notes })
        .eq("id", requestId);

      if (error) throw error;

      // Notify customer
      await createInAppNotification(
        customerId,
        "Order Rejected",
        `Your order has been rejected. Reason: ${formData.notes}`,
        "request_rejected",
        requestId
      );

      toast.success("Order rejected");
      onSuccess();
      onOpenChange(false);
      setFormData({ partnerId: "", estimatedDelivery: "", initialLocation: "", notes: "" });
    } catch (error: any) {
      console.error("Error rejecting order:", error);
      toast.error(error.message || "Failed to reject order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve Order</DialogTitle>
        </DialogHeader>

        {/* Request Details Preview */}
        <div className="py-4">
          <ShipmentRequestDetails requestId={requestId} compact />
        </div>

        <Separator className="my-4" />

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="partner">Shipping Partner *</Label>
            <Select value={formData.partnerId} onValueChange={(value) => setFormData({ ...formData, partnerId: value })}>
              <SelectTrigger id="partner">
                <SelectValue placeholder="Select shipping partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.company_name} - {partner.contact_person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDelivery">Estimated Delivery Date *</Label>
            <Input
              id="estimatedDelivery"
              type="date"
              value={formData.estimatedDelivery}
              onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialLocation">Initial Location</Label>
            <Input
              id="initialLocation"
              placeholder="e.g., Warehouse - Processing"
              value={formData.initialLocation}
              onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Required for Rejection)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes or rejection reason..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            Reject Order
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            Approve & Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
