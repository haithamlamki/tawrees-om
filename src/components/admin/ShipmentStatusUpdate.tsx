import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendStatusUpdateNotification } from "@/utils/notificationUtils";

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
  const [formData, setFormData] = useState({
    status: currentStatus,
    location: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("shipments")
        .update({
          status: formData.status,
          current_location: formData.location || null,
          notes: formData.notes || null,
        })
        .eq("id", shipmentId);

      if (updateError) throw updateError;

      // Get customer ID for notification
      const { data: shipmentData } = await supabase
        .from("shipments")
        .select(`
          request_id,
          shipment_requests!inner (
            customer_id
          )
        `)
        .eq("id", shipmentId)
        .single();

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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update Status"}
      </Button>
    </form>
  );
};

export default ShipmentStatusUpdate;
