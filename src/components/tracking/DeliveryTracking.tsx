import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, CheckCircle, Upload } from "lucide-react";

interface DeliveryTrackingProps {
  orderId: string;
  currentStatus: string;
}

export const DeliveryTracking = ({ orderId, currentStatus }: DeliveryTrackingProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignDriverDialogOpen, setAssignDriverDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState("");
  const queryClient = useQueryClient();

  const { data: drivers } = useQuery({
    queryKey: ["active-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_drivers")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: order } = useQuery({
    queryKey: ["order-delivery", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_orders")
        .select(`
          *,
          driver:wms_drivers(full_name, phone, vehicle_plate)
        `)
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from("wms_orders")
        .update({ driver_id: driverId, status: "assigned" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-delivery", orderId] });
      toast.success("Driver assigned successfully");
      setAssignDriverDialogOpen(false);
    },
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: async () => {
      let photoUrl = null;

      // Upload photo if provided
      if (proofPhoto) {
        const fileExt = proofPhoto.name.split(".").pop();
        const fileName = `${orderId}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from("wms-delivery-proofs")
          .upload(fileName, proofPhoto);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("wms-delivery-proofs")
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      const { error } = await supabase
        .from("wms_orders")
        .update({
          status: "delivered",
          delivery_notes: deliveryNotes,
          delivery_proof_photo: photoUrl,
          delivery_signature: signature,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-delivery", orderId] });
      toast.success("Delivery completed successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete delivery");
    },
  });

  const resetForm = () => {
    setDeliveryNotes("");
    setProofPhoto(null);
    setSignature("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofPhoto(e.target.files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {order?.driver ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Assigned Driver:</span>
              <span className="font-medium">{order.driver.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Phone:</span>
              <span className="font-medium">{order.driver.phone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vehicle:</span>
              <span className="font-medium">{order.driver.vehicle_plate}</span>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setAssignDriverDialogOpen(true)}
            className="w-full"
            disabled={currentStatus === "delivered"}
          >
            Assign Driver
          </Button>
        )}

        {order?.driver && currentStatus !== "delivered" && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Delivery
          </Button>
        )}

        {order?.delivery_proof_photo && (
          <div className="mt-4">
            <Label>Delivery Proof</Label>
            <img
              src={order.delivery_proof_photo}
              alt="Delivery proof"
              className="w-full rounded-lg mt-2"
            />
          </div>
        )}
      </CardContent>

      {/* Assign Driver Dialog */}
      <Dialog open={assignDriverDialogOpen} onOpenChange={setAssignDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Driver</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers?.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name} - {driver.vehicle_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDriverDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => assignDriverMutation.mutate(selectedDriver)}
              disabled={!selectedDriver || assignDriverMutation.isPending}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Delivery Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Delivery Notes</Label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Add any delivery notes..."
                rows={3}
              />
            </div>
            <div>
              <Label>Proof of Delivery Photo</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="proof-photo"
                />
                <label htmlFor="proof-photo">
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <span>
                      <Camera className="mr-2 h-4 w-4" />
                      {proofPhoto ? proofPhoto.name : "Take Photo"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <div>
              <Label>Customer Signature</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Customer name or signature"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => completeDeliveryMutation.mutate()}
              disabled={completeDeliveryMutation.isPending || !signature}
            >
              <Upload className="mr-2 h-4 w-4" />
              Complete Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
