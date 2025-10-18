import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendStatusUpdateNotification } from "@/utils/notificationUtils";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ShipmentStatusUpdateProps {
  shipmentId: string;
  currentStatus: string;
  trackingNumber: string;
  onUpdate?: () => void;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
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
  const [statusPhotos, setStatusPhotos] = useState<File[]>([]);
  const [containerNumber, setContainerNumber] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [formData, setFormData] = useState({
    status: currentStatus,
    location: "",
    notes: "",
  });

  // Fetch due amount and drivers when component mounts
  useEffect(() => {
    const fetchData = async () => {
      // Fetch due amount
      const { data: shipmentData } = await supabase
        .from("shipments")
        .select(`
          request_id,
          container_number,
          assigned_driver_id,
          shipment_requests!inner (
            calculated_cost
          )
        `)
        .eq("id", shipmentId)
        .single();

      if (shipmentData?.shipment_requests?.calculated_cost) {
        setDueAmount(shipmentData.shipment_requests.calculated_cost);
      }
      if (shipmentData?.container_number) {
        setContainerNumber(shipmentData.container_number);
      }
      if (shipmentData?.assigned_driver_id) {
        setSelectedDriver(shipmentData.assigned_driver_id);
      }

      // Fetch available drivers
      const { data: driversData } = await supabase
        .from("wms_drivers")
        .select("*")
        .order("name");
      
      if (driversData) {
        setDrivers(driversData);
      }
    };
    fetchData();
  }, [shipmentId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (statusPhotos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "Maximum 5 photos allowed per status update",
        variant: "destructive",
      });
      return;
    }
    setStatusPhotos([...statusPhotos, ...files]);
  };

  const removePhoto = (index: number) => {
    setStatusPhotos(statusPhotos.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    // Container number required for in_transit
    if (formData.status === "in_transit") {
      if (!containerNumber.trim()) {
        toast({
          title: "Container number required",
          description: "Please enter a container number for in-transit status",
          variant: "destructive",
        });
        return false;
      }
      const containerRegex = /^[A-Z]{4}[0-9]{7}$/;
      if (!containerRegex.test(containerNumber.toUpperCase())) {
        toast({
          title: "Invalid container number",
          description: "Format should be 4 letters + 7 digits (e.g., MSCU1234567)",
          variant: "destructive",
        });
        return false;
      }
    }

    // Driver required for out_for_delivery
    if (formData.status === "out_for_delivery" && !selectedDriver) {
      toast({
        title: "Driver assignment required",
        description: "Please select a driver for out-for-delivery status",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

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

      // Upload status photos if any
      if (statusPhotos.length > 0) {
        for (const photo of statusPhotos) {
          const fileExt = photo.name.split(".").pop();
          const fileName = `${shipmentData.request_id}_status_${formData.status}_${Date.now()}.${fileExt}`;
          const filePath = `${shipmentData.request_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("shipment-documents")
            .upload(filePath, photo);

          if (!uploadError) {
            await supabase.from("shipment_documents").insert({
              shipment_request_id: shipmentData.request_id,
              document_type: "status_photo",
              file_name: photo.name,
              file_path: filePath,
              file_type: photo.type,
              file_size: photo.size,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id,
            });
          }
        }
      }

      // Update container tracking for in_transit status
      if (formData.status === "in_transit" && containerNumber) {
        const trackingUrl = `https://www.searates.com/container/tracking/?container=${containerNumber.toUpperCase()}`;
        await supabase
          .from("shipments")
          .update({
            container_number: containerNumber.toUpperCase(),
            container_tracking_url: trackingUrl,
          })
          .eq("id", shipmentId);
      }

      // Update driver assignment for out_for_delivery status
      if (formData.status === "out_for_delivery" && selectedDriver) {
        await supabase
          .from("shipments")
          .update({
            assigned_driver_id: selectedDriver,
          })
          .eq("id", shipmentId);
      }

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
          <SelectTrigger 
            id="status"
            style={{
              color: formData.status === "received_from_supplier" ? "#FFC000" :
                     formData.status === "processing" ? "#EE0000" :
                     formData.status === "in_transit" ? "#EE0000" :
                     formData.status === "customs" ? "#00B0F0" :
                     formData.status === "received_muscat_wh" ? "#00B050" :
                     formData.status === "out_for_delivery" ? "#00B050" :
                     formData.status === "delivered" ? "#00B050" : undefined,
              fontWeight: formData.status ? "600" : undefined
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="received_from_supplier">
              <span style={{ color: "#FFC000" }}>● </span>
              Received from Supplier
            </SelectItem>
            <SelectItem value="processing">
              <span style={{ color: "#EE0000" }}>● </span>
              Processing
            </SelectItem>
            <SelectItem value="in_transit">
              <span style={{ color: "#EE0000" }}>● </span>
              In Transit
            </SelectItem>
            <SelectItem value="customs">
              <span style={{ color: "#00B0F0" }}>● </span>
              At Customs
            </SelectItem>
            <SelectItem value="received_muscat_wh">
              <span style={{ color: "#00B050" }}>● </span>
              Received Muscat WH
            </SelectItem>
            <SelectItem value="out_for_delivery">
              <span style={{ color: "#00B050" }}>● </span>
              Out for Delivery
            </SelectItem>
            <SelectItem value="delivered">
              <span style={{ color: "#00B050" }}>● </span>
              Delivered
            </SelectItem>
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

      {formData.status === "in_transit" && (
        <div className="space-y-2">
          <Label htmlFor="container-number">
            Container Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="container-number"
            value={containerNumber}
            onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
            placeholder="e.g., MSCU1234567"
            maxLength={11}
          />
          <p className="text-sm text-muted-foreground">
            Format: 4 letters + 7 digits (e.g., MSCU1234567)
          </p>
          {containerNumber && /^[A-Z]{4}[0-9]{7}$/.test(containerNumber) && (
            <p className="text-sm text-primary flex items-center gap-1">
              🔗 Tracking: www.searates.com/container/tracking
            </p>
          )}
        </div>
      )}

      {formData.status === "out_for_delivery" && (
        <div className="space-y-2">
          <Label htmlFor="driver">
            Assign Driver <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger id="driver">
              <SelectValue placeholder="Select a driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name} - {driver.vehicle_type} ({driver.vehicle_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDriver && (
            <div className="rounded-lg border p-3 mt-2">
              <p className="text-sm font-medium">
                {drivers.find((d) => d.id === selectedDriver)?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                📞 {drivers.find((d) => d.id === selectedDriver)?.phone}
              </p>
              <p className="text-sm text-muted-foreground">
                🚚 {drivers.find((d) => d.id === selectedDriver)?.vehicle_type} (
                {drivers.find((d) => d.id === selectedDriver)?.vehicle_number})
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status-photos">Upload Photos (Max 5)</Label>
        <Input
          id="status-photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          disabled={statusPhotos.length >= 5}
        />
        {statusPhotos.length > 0 && (
          <div className="space-y-2">
            {statusPhotos.map((photo, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Upload photos showing current shipment condition
        </p>
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
