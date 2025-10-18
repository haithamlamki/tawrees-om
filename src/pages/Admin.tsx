import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Settings, Package, CheckCircle, XCircle, Users, Ship, BarChart3, UserCog, Building2, FileText, History as HistoryIcon, ClipboardList, FolderSync, Warehouse, Truck, ChevronDown } from "lucide-react";
import CustomerManagement from "@/components/admin/CustomerManagement";
import ShipmentManagement from "@/components/admin/ShipmentManagement";
import DashboardMetrics from "@/components/admin/DashboardMetrics";
import RevenueChart from "@/components/admin/RevenueChart";
import TopCustomers from "@/components/admin/TopCustomers";
import QuoteManagement from "@/components/admin/QuoteManagement";
import AnalyticsExport from "@/components/admin/AnalyticsExport";
import UserRoleManagement from "@/components/admin/UserRoleManagement";
import PartnerManagement from "@/components/admin/PartnerManagement";
import { SurchargeManagement } from "@/components/admin/SurchargeManagement";
import { SupplierManagement } from "@/components/admin/SupplierManagement";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { LastMileRateManagement } from "@/components/admin/LastMileRateManagement";
import { RateHistoryViewer } from "@/components/admin/RateHistoryViewer";
import { QualityCheckManager } from "@/components/admin/QualityCheckManager";
import { BulkOperations } from "@/components/admin/BulkOperations";
import { CSVExportButtons } from "@/components/admin/CSVExportButtons";
import { CSVImportDialog } from "@/components/admin/CSVImportDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarginOverride } from "@/components/admin/MarginOverride";
import ShipmentStatusUpdate from "@/components/admin/ShipmentStatusUpdate";
import AgreementsManagement from "@/components/admin/AgreementsManagement";
import { ShipmentApproval } from "@/components/admin/ShipmentApproval";
import { sendRequestApprovedNotification } from "@/utils/notificationUtils";
import { ShipmentInvoices } from "@/components/admin/ShipmentInvoices";

interface ShipmentRequest {
  id: string;
  customer_id: string;
  shipping_type: string;
  calculated_cost: number;
  status: string;
  created_at: string;
  items?: any;
  calculation_method?: string;
  cbm_volume?: number;
  weight_kg?: number;
  delivery_type?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  notes?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  container_types?: {
    name: string;
  };
}

interface Rate {
  id: string;
  rate_type: string;
  base_rate: number;
  buy_price: number | null;
  sell_price: number | null;
  margin_percentage: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<ShipmentRequest[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [baseRate, setBaseRate] = useState<string>("");
  const [buyPrice, setBuyPrice] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<string>("");
  const [margin, setMargin] = useState<string>("");
  const [selectedRequestForQuote, setSelectedRequestForQuote] = useState<string | null>(null);
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<ShipmentRequest | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  useEffect(() => {
    // Read hash from URL and set active tab
    const hash = window.location.hash.slice(1); // Remove # prefix
    if (hash) {
      setActiveTab(hash);
    }
    
    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash) {
        setActiveTab(newHash);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const isAdmin = roles?.some(r => r.role === "admin");
    
    if (!isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
      return;
    }

    await loadPendingRequests();
    await loadRates();
    setLoading(false);
  };

  const loadPendingRequests = async () => {
    const { data, error } = await supabase
      .from("shipment_requests")
      .select(`
        *,
        profiles (
          full_name,
          email
        ),
        container_types (
          name
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      return;
    }

    setPendingRequests(data || []);
  };

  const loadRates = async () => {
    const { data, error } = await supabase
      .from("shipping_rates")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error loading rates:", error);
      return;
    }

    setRates(data || []);
  };

  const handleApproveRequest = async (requestId: string, paymentTiming: "before" | "after") => {
    const { error: updateError } = await supabase
      .from("shipment_requests")
      .update({ status: "approved", payment_timing: paymentTiming })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Failed to approve request");
      return;
    }

    // Generate tracking number
    const trackingNumber = `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const { error: shipmentError } = await supabase
      .from("shipments")
      .insert([{
        request_id: requestId,
        tracking_number: trackingNumber,
        status: "processing",
      }]);

    if (shipmentError) {
      toast.error("Failed to create shipment");
      return;
    }

    // Get customer ID for notification
    const request = pendingRequests.find(r => r.id === requestId);
    if (request?.customer_id) {
      await sendRequestApprovedNotification(
        request.customer_id,
        requestId,
        trackingNumber
      );
    }

    toast.success(`Request approved! Tracking: ${trackingNumber}`);
    await loadPendingRequests();
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("shipment_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to reject request");
      return;
    }

    toast.success("Request rejected");
    await loadPendingRequests();
  };

  const handleUpdateRate = async () => {
    if (!selectedRate) {
      toast.error("Please select a rate");
      return;
    }

    // Build update payload with numeric validation
    const updateData: any = {};

    const buy = buyPrice ? Number(buyPrice) : undefined;
    const sell = sellPrice ? Number(sellPrice) : undefined;
    const base = baseRate ? Number(baseRate) : undefined;
    const mrg = margin ? Number(margin) : undefined;

    if (base !== undefined) {
      if (!Number.isFinite(base) || base < 0) {
        toast.error("Base rate must be a valid non-negative number");
        return;
      }
      updateData.base_rate = base;
    }
    if (buy !== undefined) {
      if (!Number.isFinite(buy) || buy <= 0) {
        toast.error("Buy price must be greater than 0");
        return;
      }
      updateData.buy_price = buy;
    }
    if (sell !== undefined) {
      if (!Number.isFinite(sell) || sell <= 0) {
        toast.error("Sell price must be greater than 0");
        return;
      }
      updateData.sell_price = sell;
    }
    if (mrg !== undefined) {
      if (!Number.isFinite(mrg)) {
        toast.error("Margin must be a valid number");
        return;
      }
      updateData.margin_percentage = mrg;
    }

    if (buy !== undefined && sell !== undefined && sell <= buy) {
      toast.error("Sell price must be greater than buy price");
      return;
    }

    if (Object.keys(updateData).length === 0) {
      toast.error("Please fill at least one field to update");
      return;
    }

    const { data, error } = await supabase
      .from("shipping_rates")
      .update(updateData)
      .eq("id", selectedRate)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Failed to update rate:", error);
      toast.error(`Failed to update rate: ${error.message}`);
      return;
    }

    if (!data) {
      toast.error("No rate was updated. You might not have permission.");
      return;
    }

    toast.success("Rate updated successfully");
    await loadRates();
    setSelectedRate("");
    setBaseRate("");
    setBuyPrice("");
    setSellPrice("");
    setMargin("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage rates and approve shipment requests</p>
        </div>
        <div className="flex gap-2">
          <CSVImportDialog />
            <CSVExportButtons />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Package className="mr-2 h-4 w-4" />
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="shipments">
              <Ship className="mr-2 h-4 w-4" />
              Shipments
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="mr-2 h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="users">
              <UserCog className="mr-2 h-4 w-4" />
              User Roles
            </TabsTrigger>
            <TabsTrigger value="partners">
              <Building2 className="mr-2 h-4 w-4" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              <Building2 className="mr-2 h-4 w-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="surcharges">
              <Settings className="mr-2 h-4 w-4" />
              Surcharges
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <Package className="mr-2 h-4 w-4" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="mr-2 h-4 w-4" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="rates">
              <DollarSign className="mr-2 h-4 w-4" />
              Rates
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="qc">
              <ClipboardList className="mr-2 h-4 w-4" />
              Quality Check
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <FolderSync className="mr-2 h-4 w-4" />
              Bulk Ops
            </TabsTrigger>
            <TabsTrigger value="wms">
              <Warehouse className="mr-2 h-4 w-4" />
              WMS
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <FileText className="mr-2 h-4 w-4" />
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardMetrics />
            
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <RevenueChart />
              </div>
              <div className="space-y-6">
                <TopCustomers />
                <AnalyticsExport />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{request.profiles?.full_name || "Unknown"}</CardTitle>
                          <CardDescription>
                            {request.shipping_type.toUpperCase()} • {new Date(request.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{request.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Top Info Row */}
                      <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Email</p>
                          <p className="font-medium truncate">{request.profiles?.email || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Shipping Method</p>
                          <p className="font-medium">{request.calculation_method?.toUpperCase() || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Delivery Type</p>
                          <p className="font-medium capitalize">{request.delivery_type || "-"}</p>
                        </div>
                        {request.container_types && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Container</p>
                            <p className="font-medium">{request.container_types.name}</p>
                          </div>
                        )}
                      </div>

                       {/* Enhanced Items Preview with Thumbnails */}
                       {request.items && Array.isArray(request.items) && request.items.length > 0 && (
                         <div className="space-y-3">
                           {/* Thumbnail Gallery & Quick Stats */}
                           <div className="flex flex-wrap items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                             {/* Thumbnail Gallery */}
                             <div className="flex items-center gap-2">
                               <Package className="h-4 w-4 text-primary" />
                               <span className="text-sm font-semibold">{request.items.length} Items:</span>
                               <div className="flex gap-1">
                                 {request.items
                                   .filter((item: any) => item.productImage)
                                   .slice(0, 4)
                                   .map((item: any, idx: number) => (
                                     <img
                                       key={idx}
                                       src={item.productImage}
                                       alt={item.productName || "Product"}
                                       className="w-10 h-10 object-cover rounded border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                                       title={item.productName || "Product"}
                                     />
                                   ))}
                                 {request.items.filter((item: any) => item.productImage).length > 4 && (
                                   <div className="w-10 h-10 rounded border-2 border-white bg-muted flex items-center justify-center text-xs font-medium">
                                     +{request.items.filter((item: any) => item.productImage).length - 4}
                                   </div>
                                 )}
                                 {request.items.filter((item: any) => item.productImage).length === 0 && (
                                   <div className="text-xs text-muted-foreground italic">No images</div>
                                 )}
                               </div>
                             </div>

                             {/* Quick Stats */}
                             <div className="flex-1 flex flex-wrap gap-3 text-xs">
                               <Badge variant="secondary" className="flex items-center gap-1">
                                 <span className="font-medium">Total Qty:</span>
                                 {request.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}
                               </Badge>
                               {request.cbm_volume && (
                                 <Badge variant="secondary" className="flex items-center gap-1">
                                   <span className="font-medium">CBM:</span>
                                   {request.cbm_volume.toFixed(3)} m³
                                 </Badge>
                               )}
                               {request.weight_kg && (
                                 <Badge variant="secondary" className="flex items-center gap-1">
                                   <span className="font-medium">Weight:</span>
                                   {request.weight_kg.toFixed(2)} kg
                                 </Badge>
                               )}
                             </div>
                           </div>

                           {/* Expandable Detailed List */}
                           <details className="group">
                             <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-2">
                               <span>View Detailed Item List</span>
                               <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                             </summary>
                             <div className="mt-3 space-y-2">
                               {request.items.map((item: any, idx: number) => (
                                 <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                   {item.productImage && (
                                     <img
                                       src={item.productImage}
                                       alt={item.productName || "Product"}
                                       className="w-16 h-16 object-cover rounded border flex-shrink-0"
                                     />
                                   )}
                                   <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                     {item.productName && (
                                       <div className="sm:col-span-2">
                                         <span className="text-muted-foreground">Product: </span>
                                         <span className="font-medium">{item.productName}</span>
                                       </div>
                                     )}
                                     <div>
                                       <span className="text-muted-foreground">Dimensions: </span>
                                       <span className="font-medium">
                                         {item.length}×{item.width}×{item.height} {item.dimensionUnit}
                                       </span>
                                     </div>
                                     <div>
                                       <span className="text-muted-foreground">Weight: </span>
                                       <span className="font-medium">{item.weight} {item.weightUnit}</span>
                                     </div>
                                     <div>
                                       <span className="text-muted-foreground">Qty: </span>
                                       <Badge variant="outline" className="ml-1">{item.quantity}</Badge>
                                     </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </details>
                         </div>
                       )}

                      {/* Summary & Delivery Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Totals - CBM */}
                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">Total CBM</p>
                          <p className="text-2xl font-bold text-primary">
                            {request.cbm_volume ? request.cbm_volume.toFixed(3) : '0.000'} m³
                          </p>
                        </div>

                        {/* Totals - Weight */}
                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">Total Weight</p>
                          <p className="text-2xl font-bold text-primary">
                            {request.weight_kg ? request.weight_kg.toFixed(2) : '0.00'} kg
                          </p>
                        </div>

                        {/* Delivery Info */}
                        {request.delivery_type && (
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

                      {/* Notes Row */}
                      {request.notes && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-semibold mb-1">Customer Notes</p>
                          <p className="text-xs text-muted-foreground">{request.notes}</p>
                        </div>
                      )}

                      {/* Bottom Action Row */}
                      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Calculated Cost</p>
                          <p className="text-2xl font-bold">${request.calculated_cost.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setSelectedRequestForQuote(request.id)}
                          >
                            <DollarSign className="mr-1 h-3 w-3" />
                            Create Quote
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setSelectedRequestForApproval(request)}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approve Order
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quote Creation Dialog */}
            <Dialog open={!!selectedRequestForQuote} onOpenChange={(open) => !open && setSelectedRequestForQuote(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Quote</DialogTitle>
                </DialogHeader>
                {selectedRequestForQuote && (
                  <QuoteManagement
                    requestId={selectedRequestForQuote}
                    calculatedCost={pendingRequests.find(r => r.id === selectedRequestForQuote)?.calculated_cost || 0}
                    onQuoteCreated={() => {
                      setSelectedRequestForQuote(null);
                      loadPendingRequests();
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Order Approval Dialog */}
            {selectedRequestForApproval && (
              <ShipmentApproval
                requestId={selectedRequestForApproval.id}
                customerId={selectedRequestForApproval.customer_id}
                open={!!selectedRequestForApproval}
                onOpenChange={(open) => !open && setSelectedRequestForApproval(null)}
                onSuccess={() => {
                  setSelectedRequestForApproval(null);
                  loadPendingRequests();
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="customers">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="shipments">
            <ShipmentManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserRoleManagement />
          </TabsContent>

          <TabsContent value="partners">
            <PartnerManagement />
          </TabsContent>

          <TabsContent value="suppliers">
            <SupplierManagement />
          </TabsContent>

          <TabsContent value="surcharges">
            <SurchargeManagement />
          </TabsContent>

          <TabsContent value="delivery">
            <LastMileRateManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="history">
            <RateHistoryViewer />
          </TabsContent>

          <TabsContent value="rates">
            <AgreementsManagement />
          </TabsContent>

          <TabsContent value="qc">
            <QualityCheckManager />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkOperations />
          </TabsContent>

          <TabsContent value="wms">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5" />
                    Warehouse Management System
                  </CardTitle>
                  <CardDescription>
                    Manage warehouse operations, inventory, orders, and customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms")}
                    >
                      <BarChart3 className="h-8 w-8 text-primary" />
                      <div className="text-center">
                        <div className="font-semibold">Dashboard</div>
                        <div className="text-xs text-muted-foreground">Overview & Stats</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-customers")}
                    >
                      <Users className="h-8 w-8 text-blue-500" />
                      <div className="text-center">
                        <div className="font-semibold">Customers</div>
                        <div className="text-xs text-muted-foreground">Manage WMS Customers</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-inventory")}
                    >
                      <Package className="h-8 w-8 text-green-500" />
                      <div className="text-center">
                        <div className="font-semibold">Inventory</div>
                        <div className="text-xs text-muted-foreground">Stock Management</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-orders")}
                    >
                      <ClipboardList className="h-8 w-8 text-purple-500" />
                      <div className="text-center">
                        <div className="font-semibold">Orders</div>
                        <div className="text-xs text-muted-foreground">Order Processing</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-invoices")}
                    >
                      <FileText className="h-8 w-8 text-orange-500" />
                      <div className="text-center">
                        <div className="font-semibold">Invoices</div>
                        <div className="text-xs text-muted-foreground">Billing & Payments</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-contracts")}
                    >
                      <FileText className="h-8 w-8 text-teal-500" />
                      <div className="text-center">
                        <div className="font-semibold">Contracts</div>
                        <div className="text-xs text-muted-foreground">Contract Management</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-drivers")}
                    >
                      <Truck className="h-8 w-8 text-indigo-500" />
                      <div className="text-center">
                        <div className="font-semibold">Drivers</div>
                        <div className="text-xs text-muted-foreground">Driver Management</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3"
                      onClick={() => navigate("/admin/wms-workflow")}
                    >
                      <Settings className="h-8 w-8 text-gray-500" />
                      <div className="text-center">
                        <div className="font-semibold">Workflow</div>
                        <div className="text-xs text-muted-foreground">System Settings</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <ShipmentInvoices isAdmin={true} />
          </TabsContent>
        </Tabs>
      </>
    );
  };
  
  export default Admin;
