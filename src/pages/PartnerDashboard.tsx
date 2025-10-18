import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, MapPin, Clock, Building2, FileText, Box, Weight, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import ShipmentStatusUpdate from "@/components/admin/ShipmentStatusUpdate";
import { OrderReviewDialog } from "@/components/partner/OrderReviewDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShipmentInvoices } from "@/components/admin/ShipmentInvoices";
import { ItemDetailsViewer } from "@/components/admin/ItemDetailsViewer";
import { ShipmentItem } from "@/types/calculator";
import { PartnerPaymentRequests } from "@/components/partner/PartnerPaymentRequests";
import { PartnerStorageLocations } from "@/components/partner/PartnerStorageLocations";

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
    id: string;
    customer_id: string;
    delivery_address: string;
    delivery_city: string | null;
    delivery_country: string | null;
    delivery_contact_name: string | null;
    delivery_contact_phone: string | null;
    delivery_type: string | null;
    requested_delivery_date: string | null;
    calculated_cost: number;
    currency: string;
    items: any; // Keep as any since Supabase returns Json type
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
  const [activeTab, setActiveTab] = useState<string>("active"); // Default to Active Shipments
  const [statusFilters, setStatusFilters] = useState<string[]>([
    "received_from_supplier",
    "processing",
    "in_transit",
    "at_customs"
  ]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    // Load pending payments count
    const loadPendingPaymentsCount = async () => {
      if (!partner) return;
      
      const { data, error } = await supabase
        .from('partner_payments')
        .select('id', { count: 'exact' })
        .eq('partner_id', partner.id)
        .eq('status', 'pending_confirmation');
      
      if (!error && data) {
        setPendingPaymentsCount(data.length);
      }
    };
    
    loadPendingPaymentsCount();
  }, [partner]);

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
      'payments': 'payments',
      'profile': 'profile',
    };
    
    if (hash && tabMap[hash]) {
      setActiveTab(tabMap[hash]);
    } else if (!hash) {
      // If no hash, default to active shipments and update URL
      window.history.replaceState(null, '', '#shipments');
      setActiveTab('active');
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
            id,
            customer_id,
            delivery_address,
            delivery_city,
            delivery_country,
            delivery_contact_name,
            delivery_contact_phone,
            delivery_type,
            requested_delivery_date,
            calculated_cost,
            currency,
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
      setShipments((shipmentsData as PartnerShipment[]) || []);
    } catch (error: any) {
      toast.error("Failed to load partner data");
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
      at_customs: "#00B0F0",
      received_muscat_wh: "#00B050",
      out_for_delivery: "#00B050",
      delivered: "#00B050",
    };
    
    const color = colorMap[status];
    const style = color ? { backgroundColor: `${color}20`, color: color, borderColor: color } : {};
    
    return (
      <Badge variant="outline" style={style} className="font-semibold">
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const pendingShipments = shipments.filter(s => s.status === "pending_partner_acceptance");
  
  // Active shipments: include all non-final statuses (exclude pending acceptance, rejected, delivered, completed)
  const allActiveShipments = shipments.filter(s => 
    s.status !== "pending_partner_acceptance" && 
    s.status !== "rejected" &&
    s.status !== "delivered" &&
    s.status !== "completed"
  );
  
  const activeShipments = statusFilters.length > 0 
    ? allActiveShipments.filter(s => statusFilters.includes(s.status))
    : allActiveShipments;

  // All shipments: exclude only pending acceptance and rejected
  const allShipments = shipments.filter(s => 
    s.status !== "pending_partner_acceptance" && 
    s.status !== "rejected"
  );

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const statusFilterOptions = [
    { value: "received_from_supplier", label: "Received from Supplier" },
    { value: "processing", label: "Processing" },
    { value: "in_transit", label: "In Transit" },
    { value: "at_customs", label: "At Customs" }
  ];

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
            <TabsTrigger value="all" className="flex-1">
              All Shipments ({allShipments.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 relative">
              <DollarSign className="h-4 w-4 mr-2" />
              Payments
              {pendingPaymentsCount > 0 && (
                <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {pendingPaymentsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex-1">
              <User className="h-4 w-4 mr-2" />
              Profile
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

                  console.log('Shipment Request Data:', { 
                    shipment_id: shipment.id,
                    has_request: !!request,
                    items_count: totalItems,
                    cbm: request?.cbm_volume,
                    weight: request?.weight_kg,
                    customer: request?.profiles?.full_name,
                    delivery_address: request?.delivery_address
                  });

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

                        {/* Shipment Stats - Always visible */}
                        <div>
                          <p className="text-sm font-semibold mb-3">Shipment Details</p>
                          <div className="grid grid-cols-4 gap-3">
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
                            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <span className="text-xs text-muted-foreground">Estimate</span>
                              </div>
                              <p className="text-lg font-bold text-primary">
                                {request?.calculated_cost ? `OMR ${request.calculated_cost.toFixed(3)}` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail Gallery */}
                        {thumbnails.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Product Images</p>
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
                          </div>
                        )}

                        {/* Item Details - Always Visible */}
                        {totalItems > 0 && (
                          <div className="border border-border rounded-lg overflow-hidden">
                            <div className="p-4 bg-muted/30">
                              <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Item Details ({totalItems} items)
                              </h3>
                            </div>
                            <div className="p-4 bg-background">
                              <ItemDetailsViewer 
                                items={items} 
                                shippingType="sea"
                                requestId={request?.id}
                                onItemUpdate={() => loadPartnerData(partner?.id || '')}
                              />
                            </div>
                          </div>
                        )}

                        {/* Est Delivery */}
                        {shipment.estimated_delivery && (
                          <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <span className="font-medium">Est. Delivery: </span>
                              <span className="text-muted-foreground">
                                {new Date(shipment.estimated_delivery).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <Button 
                          onClick={() => setSelectedForAcceptance(shipment)}
                          className="w-full"
                          size="lg"
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
            {/* Status Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Filter by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {statusFilterOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={statusFilters.includes(option.value)}
                      onCheckedChange={() => toggleStatusFilter(option.value)}
                    />
                    <label
                      htmlFor={option.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {activeShipments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {allActiveShipments.length === 0 
                      ? "No active shipments" 
                      : "No shipments match the selected filters"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {activeShipments.map((shipment) => {
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
                    <Card key={shipment.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-xl">
                            {shipment.tracking_number}
                          </CardTitle>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <CardDescription>
                          Customer: {request?.profiles?.full_name || "Unknown"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Estimated Delivery */}
                        {shipment.estimated_delivery && (
                          <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <span className="font-medium">Est. Delivery: </span>
                              <span className="text-muted-foreground">
                                {new Date(shipment.estimated_delivery).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Shipment Stats */}
                        <div>
                          <p className="text-sm font-semibold mb-3">Shipment Details</p>
                          <div className="grid grid-cols-3 gap-3">
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
                            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <span className="text-xs text-muted-foreground">Estimate</span>
                              </div>
                              <p className="text-lg font-bold text-primary">
                                {request?.calculated_cost ? `OMR ${request.calculated_cost.toFixed(3)}` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail Gallery */}
                        {thumbnails.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Product Images</p>
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
                          </div>
                        )}

                        {/* Item Details */}
                        {totalItems > 0 && (
                          <div className="border border-border rounded-lg overflow-hidden">
                            <div className="p-4 bg-muted/30">
                              <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Item Details ({totalItems} items)
                              </h3>
                            </div>
                            <div className="p-4 bg-background">
                              <ItemDetailsViewer 
                                items={items} 
                                shippingType="sea"
                                requestId={request?.id}
                                onItemUpdate={() => loadPartnerData(partner?.id || '')}
                              />
                            </div>
                          </div>
                        )}

                        {shipment.notes && (
                          <div className="p-3 bg-muted/20 rounded-lg">
                            <p className="text-sm font-semibold mb-1">Notes</p>
                            <p className="text-sm text-muted-foreground">{shipment.notes}</p>
                          </div>
                        )}

                        <Button 
                          onClick={() => setSelectedShipment(shipment)}
                          className="w-full"
                          size="lg"
                        >
                          Update Status
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {allShipments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No shipments found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {allShipments.map((shipment) => {
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
                    <Card key={shipment.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-xl">
                            {shipment.tracking_number}
                          </CardTitle>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <CardDescription>
                          Customer: {request?.profiles?.full_name || "Unknown"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Estimated Delivery */}
                        {shipment.estimated_delivery && (
                          <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              <span className="font-medium">Est. Delivery: </span>
                              <span className="text-muted-foreground">
                                {new Date(shipment.estimated_delivery).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Shipment Stats */}
                        <div>
                          <p className="text-sm font-semibold mb-3">Shipment Details</p>
                          <div className="grid grid-cols-3 gap-3">
                            {request?.cbm_volume && (
                              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Box className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground">CBM</span>
                                </div>
                                <p className="text-lg font-bold text-foreground">
                                  {Number(request.cbm_volume).toFixed(2)}
                                </p>
                              </div>
                            )}
                            {request?.weight_kg && (
                              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Weight className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground">Weight</span>
                                </div>
                                <p className="text-lg font-bold text-foreground">
                                  {Number(request.weight_kg).toFixed(0)} kg
                                </p>
                              </div>
                            )}
                            {request?.calculated_cost && (
                              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <DollarSign className="h-4 w-4 text-primary" />
                                  <span className="text-xs text-muted-foreground">Value</span>
                                </div>
                                <p className="text-lg font-bold text-foreground">
                                  {request.currency} {Number(request.calculated_cost).toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Items Preview with Enhanced Display */}
                        {totalItems > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Items ({totalItems})</p>
                            <div className="border rounded-lg overflow-hidden">
                              <ItemDetailsViewer 
                                items={items} 
                                shippingType="sea"
                                requestId={request?.id}
                                onItemUpdate={() => loadPartnerData(partner?.id || '')}
                              />
                            </div>
                          </div>
                        )}

                        {shipment.notes && (
                          <div className="p-3 bg-muted/20 rounded-lg">
                            <p className="text-sm font-semibold mb-1">Notes</p>
                            <p className="text-sm text-muted-foreground">{shipment.notes}</p>
                          </div>
                        )}

                        <Button 
                          onClick={() => setSelectedShipment(shipment)}
                          className="w-full"
                          size="lg"
                        >
                          Update Status
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices">
            {partner && <ShipmentInvoices partnerId={partner.id} isAdmin={false} />}
          </TabsContent>

          <TabsContent value="payments">
            <PartnerPaymentRequests />
          </TabsContent>

          <TabsContent value="profile">
            {partner && <PartnerStorageLocations partnerId={partner.id} />}
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

        {selectedForAcceptance && selectedForAcceptance.shipment_requests && (
          <OrderReviewDialog
            shipmentId={selectedForAcceptance.id}
            requestId={selectedForAcceptance.shipment_requests.id}
            trackingNumber={selectedForAcceptance.tracking_number}
            customerId={selectedForAcceptance.shipment_requests.customer_id}
            customerName={selectedForAcceptance.shipment_requests.profiles?.full_name || "Unknown"}
            deliveryAddress={selectedForAcceptance.shipment_requests.delivery_address || ""}
            estimatedDelivery={selectedForAcceptance.shipment_requests.requested_delivery_date || ""}
            estimatedAmount={selectedForAcceptance.shipment_requests.calculated_cost || 0}
            currency={selectedForAcceptance.shipment_requests.currency || "OMR"}
            partnerId={partner?.id || ""}
            items={selectedForAcceptance.shipment_requests.items}
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
