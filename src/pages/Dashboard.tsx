import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, CheckCircle, XCircle, Ship, Settings, User, FileText, Bell, DollarSign, Building2 } from "lucide-react";
import { toast } from "sonner";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import DocumentManager from "@/components/documents/DocumentManager";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import QuoteView from "@/components/dashboard/QuoteView";
import InvoiceGenerator from "@/components/dashboard/InvoiceGenerator";
import { ShippingPartnerDetails } from "@/components/customer/ShippingPartnerDetails";
import { SupplierDetails } from "@/components/customer/SupplierDetails";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { ItemDetailsViewer } from "@/components/admin/ItemDetailsViewer";
import { QuoteApprovalDialog } from "@/components/customer/QuoteApprovalDialog";

interface ShipmentRequest {
  id: string;
  shipping_type: string;
  calculation_method: string;
  calculated_cost: number;
  status: string;
  created_at: string;
  items?: any;
  cbm_volume?: number;
  weight_kg?: number;
  container_type_id?: string;
  supplier_id?: string;
  supplier_notes?: string;
  shipments?: Shipment[];
  container_types?: {
    name: string;
  };
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
}

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  assigned_partner_id?: string;
  shipping_partners?: {
    company_name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("requests");
  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [selectedQuoteShipment, setSelectedQuoteShipment] = useState<any | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
    handlePaymentCallback();
  }, []);

  useEffect(() => {
    // Read hash from URL and set active tab
    const hash = window.location.hash.slice(1); // Remove # prefix
    if (hash && ['requests', 'profile', 'notifications', 'quotes', 'approvals', 'admin'].includes(hash)) {
      setActiveTab(hash);
    }
    
    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash && ['requests', 'profile', 'notifications', 'quotes', 'approvals', 'admin'].includes(newHash)) {
        setActiveTab(newHash);
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

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const adminRole = roles?.some(r => r.role === "admin");
    setIsAdmin(!!adminRole);

    await loadRequests(session.user.id, !!adminRole);
    await loadPendingQuotes(session.user.id);
    setLoading(false);
  };

  const handlePaymentCallback = async () => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.paid) {
          toast.success(`Payment successful! Amount: ₦${data.amount?.toFixed(2)}`);
          // Reload requests to show updated status
          await loadRequests((await supabase.auth.getUser()).data.user?.id || "", isAdmin);
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
      }
    } else if (paymentStatus === "canceled") {
      toast.error("Payment was canceled");
    }
  };

  const loadRequests = async (userId: string, isAdmin: boolean) => {
    let query = supabase
      .from("shipment_requests")
      .select(`
        *,
        container_types (
          name
        ),
        shipments (
          id,
          tracking_number,
          status,
          assigned_partner_id,
          shipping_partners:shipping_partners!shipments_assigned_partner_id_fkey (
            company_name,
            contact_person,
            phone,
            email,
            address
          )
        )
      `)
      .order("created_at", { ascending: false });
 
    if (!isAdmin) {
      query = query.eq("customer_id", userId);
    }
 
    const { data, error } = await query;

    if (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load shipment requests");
      return;
    }

    setRequests(data || []);
  };

  const loadPendingQuotes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          id,
          tracking_number,
          status,
          assigned_partner_id,
          request_id,
          partner_quote_id,
          shipment_requests!inner (
            id,
            customer_id,
            shipping_type,
            calculated_cost
          ),
          partner_shipping_quotes!inner (
            id,
            original_amount,
            partner_quoted_amount,
            adjustment_reason,
            storage_location,
            status,
            submitted_at
          )
        `)
        .eq("shipment_requests.customer_id", userId)
        .eq("status", "pending_customer_approval")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingQuotes(data || []);
    } catch (error) {
      console.error("Error loading pending quotes:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      completed: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case "approved":
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "completed":
        return <Package className="h-5 w-5 text-accent" />;
      default:
        return <Ship className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={true} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage all shipment requests and settings" : "Track your shipment requests"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">
              <Package className="mr-2 h-4 w-4" />
              Shipment Requests
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="quotes">
              <FileText className="mr-2 h-4 w-4" />
              My Quotes
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <DollarSign className="mr-2 h-4 w-4" />
              Quote Approvals {pendingQuotes.length > 0 && `(${pendingQuotes.length})`}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" onClick={() => navigate("/admin")}>
                <Settings className="mr-2 h-4 w-4" />
                Admin Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No shipment requests yet</p>
                  <Button onClick={() => navigate("/")}>
                    Create New Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="shadow-card hover:shadow-elevated transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <CardTitle className="text-lg">
                            {request.shipping_type.toUpperCase()} Shipment
                          </CardTitle>
                          <CardDescription>
                            {request.calculation_method} • {new Date(request.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="text-2xl font-bold text-accent">
                          ${request.calculated_cost.toFixed(2)}
                        </p>
                      </div>
                      {request.shipments && request.shipments.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Shipping Partner</p>
                          <p className="text-lg font-semibold">
                            {request.shipments[0].shipping_partners?.company_name || "Not assigned yet"}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Items Details - Always Visible */}
                    {request.items && Array.isArray(request.items) && request.items.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Item Details ({request.items.length})
                        </h3>
                        <ItemDetailsViewer
                          items={request.items}
                          shippingType={request.shipping_type as "air" | "sea"}
                          calculationMethod={request.calculation_method as "cbm" | "container"}
                          containerType={request.container_types?.name}
                          totalCBM={request.cbm_volume}
                          totalWeight={request.weight_kg}
                          requestId={request.id}
                          onItemUpdate={() => checkAuthAndLoadData()}
                        />
                      </div>
                    )}

                    {/* Supplier Details - Always Visible when assigned */}
                    {request.suppliers && (
                      <div className="mt-4">
                        <SupplierDetails
                          supplierName={request.suppliers.supplier_name}
                          contactPerson={request.suppliers.contact_person}
                          phone={request.suppliers.phone}
                          email={request.suppliers.email}
                          address={request.suppliers.address}
                          city={request.suppliers.city}
                          country={request.suppliers.country}
                          supplierCode={request.suppliers.supplier_code}
                          supplierNotes={request.supplier_notes}
                        />
                      </div>
                    )}

                    {/* Shipping Partner Details - Always Visible when assigned */}
                    {request.shipments && request.shipments.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <ShippingPartnerDetails
                          partnerName={request.shipments[0].shipping_partners?.company_name || "Unknown"}
                          contactPerson={request.shipments[0].shipping_partners?.contact_person}
                          phone={request.shipments[0].shipping_partners?.phone}
                          email={request.shipments[0].shipping_partners?.email}
                          address={request.shipments[0].shipping_partners?.address}
                          status={request.shipments[0].status}
                          trackingNumber={request.shipments[0].tracking_number}
                        />
                      </div>
                    )}
                    
                    {/* Status Timeline */}
                    {request.shipments && request.shipments.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <StatusTimeline
                          currentStatus={request.shipments[0].status}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 justify-end mt-4">
                      {request.shipments && request.shipments.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/tracking/${request.shipments![0].tracking_number}`)}
                        >
                          Track Shipment
                        </Button>
                      )}
                      <InvoiceGenerator 
                        requestId={request.id} 
                        requestStatus={request.status}
                      />
                    </div>

                    {/* Document Manager */}
                    <DocumentManager shipmentRequestId={request.id} />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            {requests.length > 0 ? (
              requests.map((request) => (
                <div key={request.id} className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div>
                      <p className="font-medium">Request #{request.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.shipping_type} - {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequestId(selectedRequestId === request.id ? null : request.id)}
                    >
                      {selectedRequestId === request.id ? "Hide Quote" : "View Quote"}
                    </Button>
                  </div>
                  {selectedRequestId === request.id && (
                    <QuoteView requestId={request.id} />
                  )}
                </div>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No shipment requests yet</p>
                  <Button onClick={() => navigate("/")}>Create New Request</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            {pendingQuotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No quotes pending your approval</p>
                </CardContent>
              </Card>
            ) : (
              pendingQuotes.map((shipment) => {
                const quote = shipment.partner_shipping_quotes;
                const amountDifference = quote.partner_quoted_amount - quote.original_amount;
                const hasAdjustment = Math.abs(amountDifference) > 0.01;

                return (
                  <Card key={shipment.id} className="border-primary/50">
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-xl">
                          Shipment {shipment.tracking_number}
                        </CardTitle>
                        <Badge variant="outline">Pending Your Approval</Badge>
                      </div>
                      <CardDescription>
                        {shipment.shipment_requests?.shipping_type?.toUpperCase()} Shipment
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Original Estimate</p>
                          <p className="text-2xl font-bold">
                            OMR {quote.original_amount.toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Partner Quote</p>
                          <p className="text-2xl font-bold text-primary">
                            OMR {quote.partner_quoted_amount.toFixed(3)}
                          </p>
                          {hasAdjustment && (
                            <Badge 
                              variant={amountDifference > 0 ? "destructive" : "default"}
                              className="mt-1"
                            >
                              {amountDifference > 0 ? "+" : ""}
                              {amountDifference.toFixed(3)} OMR
                            </Badge>
                          )}
                        </div>
                      </div>

                      {quote.adjustment_reason && (
                        <div className="p-3 bg-accent/10 rounded-lg">
                          <p className="text-sm font-medium mb-1">Partner's Note:</p>
                          <p className="text-sm text-muted-foreground">
                            {quote.adjustment_reason}
                          </p>
                        </div>
                      )}

                      {quote.storage_location && (
                        <div className="text-sm">
                          <span className="font-medium">Storage Location: </span>
                          <span className="text-muted-foreground">{quote.storage_location}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Submitted: {new Date(quote.submitted_at).toLocaleString()}
                      </div>

                      <Button
                        onClick={() => setSelectedQuoteShipment(shipment)}
                        className="w-full"
                        size="lg"
                      >
                        Review & Approve Quote
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Quote Approval Dialog */}
        {selectedQuoteShipment && (
          <QuoteApprovalDialog
            quoteId={selectedQuoteShipment.partner_quote_id}
            shipmentId={selectedQuoteShipment.id}
            trackingNumber={selectedQuoteShipment.tracking_number}
            partnerId={selectedQuoteShipment.assigned_partner_id}
            open={!!selectedQuoteShipment}
            onOpenChange={(open) => !open && setSelectedQuoteShipment(null)}
            onSuccess={async () => {
              setSelectedQuoteShipment(null);
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await loadRequests(user.id, isAdmin);
                await loadPendingQuotes(user.id);
              }
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
