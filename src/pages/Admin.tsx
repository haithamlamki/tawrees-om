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
import { DollarSign, Settings, Package, CheckCircle, XCircle, Users, Ship, BarChart3 } from "lucide-react";
import CustomerManagement from "@/components/admin/CustomerManagement";
import ShipmentManagement from "@/components/admin/ShipmentManagement";
import DashboardMetrics from "@/components/admin/DashboardMetrics";
import RevenueChart from "@/components/admin/RevenueChart";
import TopCustomers from "@/components/admin/TopCustomers";

interface ShipmentRequest {
  id: string;
  customer_id: string;
  shipping_type: string;
  calculated_cost: number;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
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
          full_name
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

    const updateData: any = {};
    
    if (baseRate) updateData.base_rate = parseFloat(baseRate);
    if (buyPrice) updateData.buy_price = parseFloat(buyPrice);
    if (sellPrice) updateData.sell_price = parseFloat(sellPrice);
    if (margin) updateData.margin_percentage = parseFloat(margin);

    if (Object.keys(updateData).length === 0) {
      toast.error("Please fill at least one field to update");
      return;
    }

    const { error } = await supabase
      .from("shipping_rates")
      .update(updateData)
      .eq("id", selectedRate);

    if (error) {
      toast.error("Failed to update rate");
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
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage rates and approve shipment requests</p>
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
            <TabsTrigger value="rates">
              <DollarSign className="mr-2 h-4 w-4" />
              Rates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardMetrics />
            
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <RevenueChart />
              </div>
              <div>
                <TopCustomers />
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
              <Card>
                <CardHeader>
                  <CardTitle>Pending Shipment Requests</CardTitle>
                  <CardDescription>Review and approve customer requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.profiles?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.shipping_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-accent">
                            ${request.calculated_cost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveRequest(request.id, "before")}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Pay Before
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleApproveRequest(request.id, "after")}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Pay After
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="customers">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="shipments">
            <ShipmentManagement />
          </TabsContent>

          <TabsContent value="rates">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Update Rates
                  </CardTitle>
                  <CardDescription>Modify base rates and profit margins</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate-select">Select Rate Type</Label>
                    <Select value={selectedRate} onValueChange={(value) => {
                      setSelectedRate(value);
                      const rate = rates.find(r => r.id === value);
                      if (rate) {
                        setBaseRate(rate.base_rate.toString());
                        setBuyPrice(rate.buy_price?.toString() || "");
                        setSellPrice(rate.sell_price?.toString() || "");
                        setMargin(rate.margin_percentage.toString());
                      }
                    }}>
                      <SelectTrigger id="rate-select">
                        <SelectValue placeholder="Choose a rate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {rates.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id}>
                            {rate.rate_type.replace("_", " ").toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buy-price">Buy Price ($)</Label>
                    <Input
                      id="buy-price"
                      type="number"
                      step="0.01"
                      placeholder="Enter buy price"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell-price">Sell Price ($)</Label>
                    <Input
                      id="sell-price"
                      type="number"
                      step="0.01"
                      placeholder="Enter sell price"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base-rate">Base Rate ($) - Legacy</Label>
                    <Input
                      id="base-rate"
                      type="number"
                      step="0.01"
                      placeholder="Enter base rate"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="margin">Margin (%) - Legacy</Label>
                    <Input
                      id="margin"
                      type="number"
                      step="0.1"
                      placeholder="Enter profit margin"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                    />
                  </div>

                  <Button onClick={handleUpdateRate} className="w-full">
                    Update Rate
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Rates</CardTitle>
                  <CardDescription>Active shipping rates with margins</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rates.map((rate) => {
                      const buyPrice = rate.buy_price || rate.base_rate;
                      const sellPrice = rate.sell_price || rate.base_rate * (1 + rate.margin_percentage / 100);
                      const profit = sellPrice - buyPrice;
                      const profitMargin = buyPrice > 0 ? ((profit / buyPrice) * 100).toFixed(2) : "0.00";
                      
                      return (
                        <div
                          key={rate.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {rate.rate_type.replace("_", " ").toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Buy: ${buyPrice.toFixed(2)} • Sell: ${sellPrice.toFixed(2)}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              Profit: ${profit.toFixed(2)} ({profitMargin}% margin)
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
