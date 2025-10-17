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
import { DollarSign, Settings, Package, CheckCircle, XCircle, Users, Ship, BarChart3, UserCog, Building2, FileText, History as HistoryIcon, ClipboardList, FolderSync, Warehouse, Truck } from "lucide-react";
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
import { sendRequestApprovedNotification } from "@/utils/notificationUtils";

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

  useEffect(() => {
    checkAdminAndLoadData();
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

        <Tabs defaultValue="dashboard" className="space-y-6">
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
                      {/* Customer Contact Info */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium">{request.profiles?.email || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Shipping Method</p>
                          <p className="text-sm font-medium">{request.calculation_method?.toUpperCase() || "-"}</p>
                        </div>
                      </div>

                      {/* Items Details */}
                      {request.items && Array.isArray(request.items) && request.items.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Items ({request.items.length})</p>
                          <div className="space-y-2">
                            {request.items.map((item: any, idx: number) => (
                              <div key={idx} className="p-3 border rounded-lg space-y-2">
                                <div className="flex items-start gap-3">
                                  {item.productImage && (
                                    <img 
                                      src={item.productImage} 
                                      alt={item.productName || "Product"} 
                                      className="w-16 h-16 object-cover rounded border"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {item.productName && (
                                      <p className="text-sm font-medium truncate">{item.productName}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Dimensions: </span>
                                        <span className="font-medium">
                                          {item.length} × {item.width} × {item.height} {item.dimensionUnit}
                                        </span>
                                      </div>
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Weight: </span>
                                        <span className="font-medium">{item.weight} {item.weightUnit}</span>
                                      </div>
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Quantity: </span>
                                        <span className="font-medium">{item.quantity}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shipment Summary */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        {request.container_types && (
                          <div>
                            <p className="text-xs text-muted-foreground">Container</p>
                            <p className="text-sm font-medium">{request.container_types.name}</p>
                          </div>
                        )}
                        {request.cbm_volume && (
                          <div>
                            <p className="text-xs text-muted-foreground">Total Volume</p>
                            <p className="text-sm font-medium">{request.cbm_volume.toFixed(3)} CBM</p>
                          </div>
                        )}
                        {request.weight_kg && (
                          <div>
                            <p className="text-xs text-muted-foreground">Total Weight</p>
                            <p className="text-sm font-medium">{request.weight_kg.toFixed(2)} kg</p>
                          </div>
                        )}
                      </div>

                      {/* Delivery Details */}
                      {request.delivery_type && (
                        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-semibold">Delivery Information</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              <span className="font-medium capitalize">{request.delivery_type}</span>
                            </div>
                            {request.delivery_contact_name && (
                              <div>
                                <span className="text-muted-foreground">Contact: </span>
                                <span className="font-medium">{request.delivery_contact_name}</span>
                              </div>
                            )}
                            {request.delivery_contact_phone && (
                              <div>
                                <span className="text-muted-foreground">Phone: </span>
                                <span className="font-medium">{request.delivery_contact_phone}</span>
                              </div>
                            )}
                            {request.delivery_address && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Address: </span>
                                <span className="font-medium">
                                  {request.delivery_address}, {request.delivery_city}, {request.delivery_country}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {request.notes && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-semibold mb-1">Customer Notes</p>
                          <p className="text-sm text-muted-foreground">{request.notes}</p>
                        </div>
                      )}

                      {/* Calculated Cost */}
                      <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Calculated Cost</p>
                          <p className="text-2xl font-bold">₦{request.calculated_cost.toFixed(2)}</p>
                        </div>
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
                          variant="secondary"
                          onClick={() => handleApproveRequest(request.id, "after")}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Quick Approve
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
        </Tabs>
      </>
    );
  };
  
  export default Admin;
