import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, Edit, Calendar } from "lucide-react";

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  current_location: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
  request_id: string;
  shipment_requests: {
    customer_id: string;
    profiles: {
      full_name: string;
    };
  };
}

const ShipmentManagement = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [locationUpdate, setLocationUpdate] = useState("");
  const [notesUpdate, setNotesUpdate] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  useEffect(() => {
    loadShipments();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('shipments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        () => {
          loadShipments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadShipments = async () => {
    const { data, error } = await supabase
      .from("shipments")
      .select(`
        *,
        shipment_requests!inner (
          customer_id,
          profiles (
            full_name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading shipments:", error);
      toast.error("Failed to load shipments");
      return;
    }

    setShipments(data || []);
    setLoading(false);
  };

  const handleUpdateShipment = async () => {
    if (!selectedShipment) return;

    const updateData: any = {
      status: statusUpdate || selectedShipment.status,
      current_location: locationUpdate || selectedShipment.current_location,
      notes: notesUpdate || null,
    };

    if (estimatedDelivery) {
      updateData.estimated_delivery = new Date(estimatedDelivery).toISOString();
    }

    // Mark as delivered if status is delivered
    if (statusUpdate === "delivered" && !selectedShipment.actual_delivery) {
      updateData.actual_delivery = new Date().toISOString();
    }

    const { error } = await supabase
      .from("shipments")
      .update(updateData)
      .eq("id", selectedShipment.id);

    if (error) {
      toast.error("Failed to update shipment");
      console.error(error);
      return;
    }

    toast.success("Shipment updated successfully");
    setSelectedShipment(null);
    setStatusUpdate("");
    setLocationUpdate("");
    setNotesUpdate("");
    setEstimatedDelivery("");
    loadShipments();
  };

  const openUpdateDialog = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setStatusUpdate(shipment.status);
    setLocationUpdate(shipment.current_location || "");
    setEstimatedDelivery(
      shipment.estimated_delivery
        ? new Date(shipment.estimated_delivery).toISOString().split("T")[0]
        : ""
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Management</CardTitle>
        <CardDescription>Update shipment status and tracking information</CardDescription>
      </CardHeader>
      <CardContent>
        {shipments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            No shipments found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Estimated Delivery</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono font-semibold">
                    {shipment.tracking_number}
                  </TableCell>
                  <TableCell>
                    {shipment.shipment_requests.profiles?.full_name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {shipment.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {shipment.current_location || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {shipment.estimated_delivery
                      ? new Date(shipment.estimated_delivery).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(shipment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUpdateDialog(shipment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Shipment</DialogTitle>
                          <DialogDescription>
                            Tracking: {shipment.tracking_number}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                              <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="delayed">Delayed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="location">Current Location</Label>
                            <Input
                              id="location"
                              value={locationUpdate}
                              onChange={(e) => setLocationUpdate(e.target.value)}
                              placeholder="e.g., Los Angeles, CA"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                              id="notes"
                              value={notesUpdate}
                              onChange={(e) => setNotesUpdate(e.target.value)}
                              placeholder="Optional update notes"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="estimated_delivery" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Estimated Delivery
                            </Label>
                            <Input
                              id="estimated_delivery"
                              type="date"
                              value={estimatedDelivery}
                              onChange={(e) => setEstimatedDelivery(e.target.value)}
                            />
                          </div>

                          <Button onClick={handleUpdateShipment} className="w-full">
                            Update Shipment
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentManagement;
