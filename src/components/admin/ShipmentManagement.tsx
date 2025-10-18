import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Package, Edit, ChevronDown, ChevronUp, Eye } from "lucide-react";
import ShipmentStatusUpdate from "./ShipmentStatusUpdate";
import { ShipmentRequestDetails } from "./ShipmentRequestDetails";

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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
                <>
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRow(expandedRow === shipment.id ? null : shipment.id)}
                        >
                          {expandedRow === shipment.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Dialog open={selectedShipment?.id === shipment.id} onOpenChange={(open) => !open && setSelectedShipment(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedShipment(shipment)}
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
                            
                            <ShipmentStatusUpdate
                              shipmentId={shipment.id}
                              currentStatus={shipment.status}
                              trackingNumber={shipment.tracking_number}
                              onUpdate={() => {
                                setSelectedShipment(null);
                                loadShipments();
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expandable Row for Request Details */}
                  {expandedRow === shipment.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <ShipmentRequestDetails requestId={shipment.request_id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentManagement;
