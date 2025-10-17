import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createInAppNotification, sendNotificationEmail } from "@/utils/notificationUtils";
import { Package, MapPin, User, Calendar } from "lucide-react";

interface OrderAcceptanceProps {
  shipmentId: string;
  trackingNumber: string;
  customerId: string;
  customerName: string;
  deliveryAddress: string;
  estimatedDelivery: string;
  items: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OrderAcceptance({
  shipmentId,
  trackingNumber,
  customerId,
  customerName,
  deliveryAddress,
  estimatedDelivery,
  items,
  open,
  onOpenChange,
  onSuccess,
}: OrderAcceptanceProps) {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("shipments")
        .update({
          status: "in_transit",
          partner_accepted_at: new Date().toISOString(),
          partner_accepted_by: user.user?.id,
        })
        .eq("id", shipmentId);

      if (error) throw error;

      // Get partner company details
      const { data: partnerData } = await supabase
        .from("user_roles")
        .select("shipping_partner_id, shipping_partners(company_name, contact_person, phone, email, address)")
        .eq("user_id", user.user?.id)
        .eq("role", "shipping_partner")
        .single();

      const partnerInfo = partnerData?.shipping_partners as any;

      // Notify customer with partner details
      await createInAppNotification(
        customerId,
        "Order Accepted by Shipping Partner",
        `${partnerInfo?.company_name} has accepted your order. Tracking: ${trackingNumber}`,
        "partner_accepted",
        shipmentId
      );

      await sendNotificationEmail({
        recipientUserId: customerId,
        templateType: "partner_accepted",
        subject: "Your Order Is Now In Transit",
        metadata: {
          trackingNumber,
          partnerName: partnerInfo?.company_name,
          partnerContact: partnerInfo?.contact_person,
          partnerPhone: partnerInfo?.phone,
          partnerEmail: partnerInfo?.email,
          estimatedDelivery: new Date(estimatedDelivery).toLocaleDateString(),
        },
      });

      toast.success("Order accepted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error accepting order:", error);
      toast.error(error.message || "Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("shipments")
        .update({
          status: "rejected",
          partner_rejection_reason: rejectionReason,
        })
        .eq("id", shipmentId);

      if (error) throw error;

      // Update request status back to pending
      const { data: shipment } = await supabase
        .from("shipments")
        .select("request_id")
        .eq("id", shipmentId)
        .single();

      if (shipment) {
        await supabase
          .from("shipment_requests")
          .update({ status: "pending" })
          .eq("id", shipment.request_id);
      }

      // Notify admin
      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminUsers) {
        for (const admin of adminUsers) {
          await createInAppNotification(
            admin.user_id,
            "Order Rejected by Partner",
            `Partner rejected order ${trackingNumber}. Reason: ${rejectionReason}`,
            "partner_rejected",
            shipmentId
          );
        }
      }

      toast.success("Order rejected and returned to admin");
      onSuccess();
      onOpenChange(false);
      setShowRejectForm(false);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting order:", error);
      toast.error(error.message || "Failed to reject order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Order Details - {trackingNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                <div>
                  <p className="font-medium">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">{deliveryAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Estimated Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(estimatedDelivery).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-2">Order Items</p>
                  {items && typeof items === "object" && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {Object.entries(items).map(([key, value]: [string, any]) => (
                        <p key={key}>
                          {key}: {JSON.stringify(value)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {showRejectForm && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Please provide a detailed reason for rejecting this order..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {!showRejectForm ? (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
              >
                Reject Order
              </Button>
              <Button onClick={handleAccept} disabled={loading}>
                Accept Order
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={loading}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={loading}>
                Confirm Rejection
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
