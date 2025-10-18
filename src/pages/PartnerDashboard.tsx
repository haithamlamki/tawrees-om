import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, MapPin, Clock, Building2, FileText, ChevronDown, Box, Weight } from "lucide-react";
import { toast } from "sonner";
import ShipmentStatusUpdate from "@/components/admin/ShipmentStatusUpdate";
import { OrderAcceptance } from "@/components/partner/OrderAcceptance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShipmentInvoices } from "@/components/admin/ShipmentInvoices";
import { ItemDetailsViewer } from "@/components/admin/ItemDetailsViewer";

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
    delivery_city: string | null;
    delivery_country: string | null;
    delivery_contact_name: string | null;
    delivery_contact_phone: string | null;
    delivery_type: string | null;
    items: any;
    cbm_volume: number | null;
    weight_kg: number | null;
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
  const [activeTab, setActiveTab] = useState<string>("pending");

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    // Read hash from URL and set active tab
    const hash = window.location.hash.slice(1); // Remove # prefix
    // Map hash values to tab values
    const tabMap: Record<string, string> = {
      'dashboard': 'pending',
      'requests': 'pending',
      'shipments': 'active',
      'invoices': 'invoices',
    };
    if (hash && tabMap[hash]) {
      setActiveTab(tabMap[hash]);
    }
    
    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash && tabMap[newHash]) {
        setActiveTab(tabMap[newHash]);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
            delivery_city,
            delivery_country,
            delivery_contact_name,
            delivery_contact_phone,
            delivery_type,
            items,
            cbm_volume,
            weight_kg,
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full inline-flex h-auto">
            <TabsTrigger value="pending" className="flex-1">
              New Requests ({pendingShipments.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              Active Shipments ({activeShipments.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
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
              <div className="grid gap-6">
                {pendingShipments.map((shipment) => {
                  const request = shipment.shipment_requests;
                  const items = request?.items || [];
                  const totalItems = Array.isArray(items) ? items.length : 0;
                  
                  // Get thumbnails from items with images
                  const thumbnails = Array.isArray(items) 
                    ? items
                        .filter((item: any) => item.image_url)
                        .slice(0, 4)
                        .map((item: any) => item.image_url)
                    : [];

                  return (
                    <Card key={shipment.id} className="border-primary/50">
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-xl">
                            New Order - {shipment.tracking_number}
                          </CardTitle>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <CardDescription>
                          Customer: {request?.profiles?.full_name || "Unknown"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Thumbnail Gallery */}
                        {thumbnails.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {thumbnails.map((url: string, idx: number) => (
                              <div 
                                key={idx} 
                                className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 border-primary/20"
                              >
                                <img 
                                  src={url} 
                                  alt={`Item ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                            {totalItems > thumbnails.length && (
                              <div className="h-20 w-20 flex-shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                                <span className="text-xs text-muted-foreground font-medium">
                                  +{totalItems - thumbnails.length}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Items</span>
                            </div>
                            <p className="text-lg font-bold text-primary">{totalItems}</p>
                          </div>
                          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Box className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">CBM</span>
                            </div>
                            <p className="text-lg font-bold text-primary">
                              {request?.cbm_volume ? request.cbm_volume.toFixed(3) : '0.000'}
                            </p>
                          </div>
                          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Weight className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Weight</span>
                            </div>
                            <p className="text-lg font-bold text-primary">
                              {request?.weight_kg ? request.weight_kg.toFixed(2) : '0.00'} kg
                            </p>
                          </div>
                        </div>

                        {/* Summary & Delivery Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Totals - CBM */}
                          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">Total CBM</p>
                            <p className="text-2xl font-bold text-primary">
                              {request?.cbm_volume ? request.cbm_volume.toFixed(3) : '0.000'} m³
                            </p>
                          </div>

                          {/* Totals - Weight */}
                          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">Total Weight</p>
                            <p className="text-2xl font-bold text-primary">
                              {request?.weight_kg ? request.weight_kg.toFixed(2) : '0.00'} kg
                            </p>
                          </div>

                          {/* Delivery Info */}
                          {request?.delivery_type && (
                            <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                              <p className="font-semibold mb-3 text-foreground">Delivery Information</p>
                              {request.delivery_contact_name && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Contact</span>
                                  <span className="font-medium">{request.delivery_contact_name}</span>
                                </div>
                              )}
                              {request.delivery_contact_phone && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Phone</span>
                                  <span className="font-medium">{request.delivery_contact_phone}</span>
                                </div>
                              )}
                              {request.delivery_address && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Address</span>
                                  <span className="font-medium">
                                    {request.delivery_address}, {request.delivery_city}, {request.delivery_country}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expandable Item Details */}
                        {totalItems > 0 && (
                          <details className="group border border-border rounded-lg overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                              <span className="font-semibold text-foreground">
                                View Detailed Item List ({totalItems} items)
                              </span>
                              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="p-4 bg-background">
                              <ItemDetailsViewer 
                                items={items} 
                                shippingType="sea"
                              />
                            </div>
                          </details>
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
                  );
                })}
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
