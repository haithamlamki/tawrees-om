import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import ShipmentStatusUpdate from "@/components/admin/ShipmentStatusUpdate";

interface AssignedShipment {
  id: string;
  tracking_number: string;
  status: string;
  current_location: string | null;
  estimated_delivery: string | null;
  notes: string | null;
  request_id: string;
  created_at: string;
}

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<AssignedShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<AssignedShipment | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is an employee
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isEmployee = roles?.some(r => r.role === "employee");
    
    if (!isEmployee) {
      toast.error("Access denied. Employee role required.");
      navigate("/dashboard");
      return;
    }

    await loadAssignedShipments(session.user.id);
  };

  const loadAssignedShipments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("assigned_to", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      toast.error("Failed to load assigned shipments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      received_from_supplier: "#FFC000",
      processing: "#EE0000",
      in_transit: "#EE0000",
      customs: "#00B0F0",
      received_muscat_wh: "#00B050",
      out_for_delivery: "#00B050",
      delivered: "#00B050",
    };
    
    const color = colorMap[status];
    const style = color ? { backgroundColor: `${color}20`, color: color, borderColor: color } : {};
    
    return (
      <Badge variant="outline" style={style} className="font-semibold">
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={true} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Employee Dashboard</h1>
          <p className="text-muted-foreground">Manage your assigned shipments</p>
        </div>

        {shipments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shipments assigned to you yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {shipments.map((shipment) => (
              <Card key={shipment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      Tracking: {shipment.tracking_number}
                    </CardTitle>
                    {getStatusBadge(shipment.status)}
                  </div>
                  <CardDescription>Request ID: {shipment.request_id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shipment.current_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Current Location: {shipment.current_location}</span>
                    </div>
                  )}
                  
                  {shipment.estimated_delivery && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Est. Delivery: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {shipment.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {shipment.notes}
                    </div>
                  )}

                  <Button 
                    onClick={() => setSelectedShipment(shipment)}
                    className="w-full"
                  >
                    Update Status
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedShipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Update Shipment Status</h3>
              <ShipmentStatusUpdate
                shipmentId={selectedShipment.id}
                currentStatus={selectedShipment.status}
                trackingNumber={selectedShipment.tracking_number}
                onUpdate={() => {
                  setSelectedShipment(null);
                  checkAuthAndLoadData();
                }}
              />
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setSelectedShipment(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
