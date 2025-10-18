import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Clock, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import ShipmentStatusUpdate from "@/components/admin/ShipmentStatusUpdate";
import { OrderAcceptance } from "@/components/partner/OrderAcceptance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShipmentInvoices } from "@/components/admin/ShipmentInvoices";

interface PartnerShipment {
  id: string;
  tracking_number: string;
  status: string;
  current_location: string | null;
  estimated_delivery: string | null;
  notes: string | null;
  request_id: string;
  created_at: string;
  shipment_requests?: {
    customer_id: string;
    delivery_address: string;
    items: any;
    profiles: {
      full_name: string;
    };
  };
}

interface ShippingPartner {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<PartnerShipment[]>([]);
  const [partner, setPartner] = useState<ShippingPartner | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<PartnerShipment | null>(null);
  const [selectedForAcceptance, setSelectedForAcceptance] = useState<PartnerShipment | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is a shipping partner
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, shipping_partner_id")
      .eq("user_id", session.user.id);

    const partnerRole = roles?.find(r => r.role === "shipping_partner");
    
    if (!partnerRole) {
      toast.error("Access denied. Shipping partner role required.");
      navigate("/dashboard");
      return;
    }

    await loadPartnerData(partnerRole.shipping_partner_id);
  };

  const loadPartnerData = async (partnerId: string) => {
    try {
      // Load partner company info
      const { data: partnerData, error: partnerError } = await supabase
        .from("shipping_partners")
        .select("*")
        .eq("id", partnerId)
        .single();

      if (partnerError) throw partnerError;
      setPartner(partnerData);

      // Load assigned shipments with customer details
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from("shipments")
        .select(`
          *,
          shipment_requests (
            customer_id,
            delivery_address,
            items,
            profiles (
              full_name
            )
          )
        `)
        .eq("assigned_partner_id", partnerId)
        .order("created_at", { ascending: false });

      if (shipmentsError) throw shipmentsError;
      setShipments(shipmentsData || []);
    } catch (error: any) {
      toast.error("Failed to load partner data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending_partner_acceptance: "outline",
      processing: "secondary",
      in_transit: "default",
      delivered: "outline",
      cancelled: "destructive",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace(/_/g, " ").toUpperCase()}</Badge>;
  };

  const pendingShipments = shipments.filter(s => s.status === "pending_partner_acceptance");
  const activeShipments = shipments.filter(s => s.status !== "pending_partner_acceptance" && s.status !== "rejected");

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Shipping Partner Dashboard</h1>
          {partner && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-5 w-5" />
              <span className="text-lg">{partner.company_name}</span>
            </div>
          )}
        </div>

        {partner && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {partner.contact_person && (
                <p><strong>Contact:</strong> {partner.contact_person}</p>
              )}
              {partner.email && (
                <p><strong>Email:</strong> {partner.email}</p>
              )}
              {partner.phone && (
                <p><strong>Phone:</strong> {partner.phone}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="pending" className="flex-wrap">
              New Requests ({pendingShipments.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-wrap">
              Active Shipments ({activeShipments.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Invoices</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingShipments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No new order requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingShipments.map((shipment) => (
                  <Card key={shipment.id} className="border-primary/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">
                          New Order - {shipment.tracking_number}
                        </CardTitle>
                        {getStatusBadge(shipment.status)}
                      </div>
                      <CardDescription>
                        Customer: {shipment.shipment_requests?.profiles?.full_name || "Unknown"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {shipment.shipment_requests?.delivery_address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{shipment.shipment_requests.delivery_address}</span>
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

                      <Button 
                        onClick={() => setSelectedForAcceptance(shipment)}
                        className="w-full"
                      >
                        Review & Accept Order
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeShipments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active shipments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeShipments.map((shipment) => (
                  <Card key={shipment.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">
                          {shipment.tracking_number}
                        </CardTitle>
                        {getStatusBadge(shipment.status)}
                      </div>
                      <CardDescription>
                        Customer: {shipment.shipment_requests?.profiles?.full_name || "Unknown"}
                      </CardDescription>
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
          </TabsContent>

          <TabsContent value="invoices">
            {partner && <ShipmentInvoices partnerId={partner.id} isAdmin={false} />}
          </TabsContent>
        </Tabs>

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
                  loadPartnerData(partner?.id || "");
                }}
              />
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setSelectedShipment(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {selectedForAcceptance && (
          <OrderAcceptance
            shipmentId={selectedForAcceptance.id}
            trackingNumber={selectedForAcceptance.tracking_number}
            customerId={selectedForAcceptance.shipment_requests?.customer_id || ""}
            customerName={selectedForAcceptance.shipment_requests?.profiles?.full_name || "Unknown"}
            deliveryAddress={selectedForAcceptance.shipment_requests?.delivery_address || ""}
            estimatedDelivery={selectedForAcceptance.estimated_delivery || ""}
            items={selectedForAcceptance.shipment_requests?.items}
            open={!!selectedForAcceptance}
            onOpenChange={(open) => !open && setSelectedForAcceptance(null)}
            onSuccess={() => {
              setSelectedForAcceptance(null);
              loadPartnerData(partner?.id || "");
            }}
          />
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
                  loadPartnerData(partner?.id || "");
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

export default PartnerDashboard;
