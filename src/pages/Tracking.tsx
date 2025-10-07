import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Plane, CheckCircle, Clock } from "lucide-react";

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  estimated_delivery: string | null;
  notes: string | null;
  created_at: string;
  shipment_requests?: {
    shipping_type: string;
    calculated_cost: number;
  };
}

const Tracking = () => {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndLoadShipment();
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
          calculated_cost
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
    setLoading(false);
  };

  const getStatusSteps = () => {
    const steps = [
      { status: "processing", label: "Processing", icon: Clock },
      { status: "in_transit", label: "In Transit", icon: Truck },
      { status: "customs", label: "Customs", icon: Package },
      { status: "ready_for_pickup", label: "Ready for Pickup", icon: CheckCircle },
      { status: "delivered", label: "Delivered", icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex(s => s.status === shipment?.status);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
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

  const steps = getStatusSteps();

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
              <div className="grid md:grid-cols-2 gap-4">
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
              </div>

              {shipment.estimated_delivery && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-semibold">
                    {new Date(shipment.estimated_delivery).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Shipment Progress</CardTitle>
              <CardDescription>Track the journey of your package</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Progress line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
                
                <div className="space-y-8">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.status} className="relative flex items-start gap-4">
                        <div
                          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 ${
                            step.completed
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          }`}
                        >
                          <Icon
                            className={`h-6 w-6 ${
                              step.completed ? "text-primary-foreground" : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="flex-1 pt-3">
                          <p
                            className={`font-semibold ${
                              step.completed ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.current && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Current Status
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {shipment.notes && (
                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Additional Notes</p>
                  <p className="text-sm text-muted-foreground">{shipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Tracking;
