import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendStatusUpdateNotification } from "@/utils/notificationUtils";
import { Upload } from "lucide-react";

interface ShipmentStatusUpdateProps {
  shipmentId: string;
  currentStatus: string;
  trackingNumber: string;
  onUpdate?: () => void;
}

const ShipmentStatusUpdate = ({
  shipmentId,
  currentStatus,
  trackingNumber,
  onUpdate,
}: ShipmentStatusUpdateProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [dueAmount, setDueAmount] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    status: currentStatus,
    location: "",
    notes: "",
  });

  // Fetch due amount when component mounts
  useEffect(() => {
    const fetchDueAmount = async () => {
      const { data: shipmentData } = await supabase
        .from("shipments")
        .select(`
          request_id,
          shipment_requests!inner (
            calculated_cost
          )
        `)
        .eq("id", shipmentId)
        .single();

      if (shipmentData?.shipment_requests?.calculated_cost) {
        setDueAmount(shipmentData.shipment_requests.calculated_cost);
      }
    };
    fetchDueAmount();
  }, [shipmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get shipment request data
      const { data: shipmentData, error: shipmentError } = await supabase
        .from("shipments")
        .select(`
          request_id,
          shipment_requests!inner (
            customer_id
          )
        `)
        .eq("id", shipmentId)
        .single();

      if (shipmentError) throw shipmentError;

      // If setting status to delivered, check payment or require payment slip
      if (formData.status === "delivered") {
        // Check if payment exists and is paid
        const { data: payment } = await supabase
          .from("payments")
          .select("status")
          .eq("shipment_request_id", shipmentData.request_id)
          .eq("status", "paid")
          .single();

        if (!payment && !paymentSlip) {
          toast({
            title: "Payment Required",
            description: "Order must be paid or attach a payment slip before marking as delivered.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Upload payment slip if provided
        if (paymentSlip) {
          const fileExt = paymentSlip.name.split(".").pop();
          const fileName = `${shipmentData.request_id}_payment_slip_${Date.now()}.${fileExt}`;
          const filePath = `${shipmentData.request_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("shipment-documents")
            .upload(filePath, paymentSlip);

          if (uploadError) throw uploadError;

          // Create document record
          await supabase.from("shipment_documents").insert({
            shipment_request_id: shipmentData.request_id,
            document_type: "payment_slip",
            file_name: paymentSlip.name,
            file_path: filePath,
            file_type: paymentSlip.type,
            file_size: paymentSlip.size,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          });
        }
      }

      // Update shipment status
      const { error: updateError } = await supabase
        .from("shipments")
        .update({
          status: formData.status,
          current_location: formData.location || null,
          notes: formData.notes || null,
        })
        .eq("id", shipmentId);

      if (updateError) throw updateError;

      // Send notification
      if (shipmentData?.shipment_requests?.customer_id) {
        await sendStatusUpdateNotification(
          shipmentData.shipment_requests.customer_id,
          shipmentId,
          formData.status,
          trackingNumber,
          formData.location
        );
      }

      toast({
        title: "Status updated",
        description: "Shipment status has been updated and customer notified.",
      });

      onUpdate?.();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="customs">At Customs</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Current Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Lagos Port"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional information..."
          rows={3}
        />
      </div>

      {formData.status === "delivered" && (
        <div className="space-y-2">
          {dueAmount && (
            <div className="rounded-lg bg-muted p-3 mb-2">
              <p className="text-sm font-medium">Due Amount: ${dueAmount.toFixed(2)}</p>
            </div>
          )}
          <Label htmlFor="payment-slip">Payment Slip (Required if unpaid)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="payment-slip"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setPaymentSlip(e.target.files?.[0] || null)}
              className="flex-1"
            />
            {paymentSlip && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPaymentSlip(null)}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload payment slip if order is not yet paid
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update Status"}
      </Button>
    </form>
  );
};

export default ShipmentStatusUpdate;
