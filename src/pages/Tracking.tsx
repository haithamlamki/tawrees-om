import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Plane, Calendar } from "lucide-react";
import TrackingTimeline from "@/components/tracking/TrackingTimeline";
import { SupplierDetails } from "@/components/customer/SupplierDetails";

interface StatusHistoryItem {
  id: string;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  current_location: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  notes: string | null;
  created_at: string;
  shipment_requests?: {
    shipping_type: string;
    calculated_cost: number;
    supplier_id?: string;
    supplier_notes?: string;
    suppliers?: {
      id: string;
      supplier_name: string;
      contact_person: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      supplier_code: string | null;
    };
  };
}

const Tracking = () => {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndLoadShipment();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('tracking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `tracking_number=eq.${trackingNumber}`
        },
        () => {
          checkAuthAndLoadShipment();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shipment_status_history'
        },
        () => {
          loadStatusHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackingNumber]);

  const checkAuthAndLoadShipment = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);

    if (!trackingNumber) {
      navigate("/dashboard");
      return;
    }

    const { data, error } = await supabase
      .from("shipments")
      .select(`
        *,
        shipment_requests (
          shipping_type,
          calculated_cost,
          supplier_id,
          supplier_notes,
          suppliers (
            id,
            supplier_name,
            contact_person,
            phone,
            email,
            address,
            city,
            country,
            supplier_code
          )
        )
      `)
      .eq("tracking_number", trackingNumber)
      .single();

    if (error || !data) {
      console.error("Error loading shipment:", error);
      setLoading(false);
      return;
    }

    setShipment(data as any);
    await loadStatusHistory(data.id);
    setLoading(false);
  };

  const loadStatusHistory = async (shipmentId?: string) => {
    const id = shipmentId || shipment?.id;
    if (!id) return;

    const { data, error } = await supabase
      .from("shipment_status_history")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading status history:", error);
      return;
    }

    setStatusHistory(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={isAuthenticated} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={isAuthenticated} />
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Shipment Not Found</h1>
          <p className="text-muted-foreground">
            We couldn't find a shipment with tracking number: {trackingNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Track Your Shipment</CardTitle>
                  <CardDescription className="text-lg mt-1">
                    Tracking Number: <span className="font-mono font-semibold">{trackingNumber}</span>
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-sm px-4 py-2">
                  {shipment.status.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Shipping Type</p>
                  <p className="font-semibold flex items-center gap-2">
                    {shipment.shipment_requests?.shipping_type === "air" ? (
                      <Plane className="h-4 w-4 text-primary" />
                    ) : (
                      <Truck className="h-4 w-4 text-primary" />
                    )}
                    {shipment.shipment_requests?.shipping_type.toUpperCase()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Shipment Cost</p>
                  <p className="font-semibold text-accent text-lg">
                    ${shipment.shipment_requests?.calculated_cost.toFixed(2)}
                  </p>
                </div>
                {shipment.current_location && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Location</p>
                    <p className="font-semibold">{shipment.current_location}</p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {shipment.estimated_delivery && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Estimated Delivery
                    </p>
                    <p className="font-semibold">
                      {new Date(shipment.estimated_delivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {shipment.actual_delivery && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Actual Delivery</p>
                    <p className="font-semibold text-green-600">
                      {new Date(shipment.actual_delivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Supplier Information - if available */}
          {shipment.shipment_requests?.suppliers && (
            <SupplierDetails
              supplierName={shipment.shipment_requests.suppliers.supplier_name}
              contactPerson={shipment.shipment_requests.suppliers.contact_person}
              phone={shipment.shipment_requests.suppliers.phone}
              email={shipment.shipment_requests.suppliers.email}
              address={shipment.shipment_requests.suppliers.address}
              city={shipment.shipment_requests.suppliers.city}
              country={shipment.shipment_requests.suppliers.country}
              supplierCode={shipment.shipment_requests.suppliers.supplier_code}
              supplierNotes={shipment.shipment_requests.supplier_notes}
            />
          )}

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Shipment History</CardTitle>
              <CardDescription>Detailed tracking timeline</CardDescription>
            </CardHeader>
            <CardContent>
              {statusHistory.length > 0 ? (
                <TrackingTimeline statusHistory={statusHistory} />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No tracking updates yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Tracking;
