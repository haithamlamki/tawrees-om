import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, FileText, AlertCircle, TrendingUp, Clock, DollarSign, CheckCircle, ArrowRight } from "lucide-react";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import type { WMSContract, WMSOrder, WMSInvoice, WMSInventory } from "@/types/wms";

export default function CustomerDashboard() {
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();
  const navigate = useNavigate();

  // Get comprehensive stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["wms-dashboard-stats", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;

      const [inventory, orders, invoices, contract] = await Promise.all([
        supabase.from("wms_inventory").select("*").eq("customer_id", customer.id),
        supabase.from("wms_orders").select("*").eq("customer_id", customer.id),
        supabase.from("wms_invoices").select("*").eq("customer_id", customer.id),
        supabase.from("wms_contracts").select("*").eq("customer_id", customer.id).eq("status", "active").maybeSingle(),
      ]);

      const totalInventoryValue = inventory.data?.reduce(
        (sum, item) => sum + (item.price_per_unit || 0) * item.quantity,
        0
      ) || 0;

      const totalSpent = invoices.data?.filter((i) => i.status === "paid").reduce(
        (sum, i) => sum + i.total_amount,
        0
      ) || 0;

      const pendingAmount = invoices.data?.filter((i) => i.status === "pending").reduce(
        (sum, i) => sum + i.total_amount,
        0
      ) || 0;

      const lowStockCount = inventory.data?.filter((i) => i.status === "low").length || 0;
      const outOfStockCount = inventory.data?.filter((i) => i.status === "out_of_stock").length || 0;

      return {
        totalInventoryItems: inventory.data?.length || 0,
        totalInventoryValue,
        lowStockCount,
        outOfStockCount,
        totalOrders: orders.data?.length || 0,
        pendingOrders: orders.data?.filter((o) => o.status === "pending_approval").length || 0,
        completedOrders: orders.data?.filter((o) => o.status === "completed").length || 0,
        inProgressOrders: orders.data?.filter((o) => o.status === "in_progress").length || 0,
        totalInvoices: invoices.data?.length || 0,
        unpaidInvoices: invoices.data?.filter((i) => i.status === "pending").length || 0,
        paidInvoices: invoices.data?.filter((i) => i.status === "paid").length || 0,
        totalSpent,
        pendingAmount,
        hasActiveContract: !!contract.data,
        contractExpiry: contract.data?.end_date,
        contractMonthlyFee: contract.data?.monthly_fee,
        contract: contract.data,
      };
    },
    enabled: !!customer?.id,
  });

  // Recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ["wms-recent-orders", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data } = await supabase
        .from("wms_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data as WMSOrder[];
    },
    enabled: !!customer?.id,
  });

  // Low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ["wms-low-stock", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data } = await supabase
        .from("wms_inventory")
        .select("*")
        .eq("customer_id", customer.id)
        .eq("status", "low")
        .limit(5);
      return data as WMSInventory[];
    },
    enabled: !!customer?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_approval": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-purple-100 text-purple-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const daysUntilExpiry = stats?.contractExpiry
    ? Math.ceil((new Date(stats.contractExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (customerLoading || statsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not linked to any warehouse customer. Please contact an administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {customer.company_name}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInventoryValue.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalInventoryItems || 0} items • {stats?.lowStockCount || 0} low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.inProgressOrders || 0} in progress • {stats?.completedOrders || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingAmount.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">{stats?.unpaidInvoices || 0} unpaid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSpent.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">{stats?.paidInvoices || 0} paid invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Contract Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate("/warehouse/orders")}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              New Order
            </Button>
            <Button variant="outline" onClick={() => navigate("/warehouse/inventory")}>
              <Package className="mr-2 h-4 w-4" />
              View Inventory
            </Button>
            <Button variant="outline" onClick={() => navigate("/warehouse/invoices")}>
              <FileText className="mr-2 h-4 w-4" />
              View Invoices
            </Button>
            <Button variant="outline" onClick={() => navigate("/warehouse/product-requests")}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Request Product
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.hasActiveContract ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Active Contract</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contract #</p>
                    <p className="font-medium">{stats.contract?.contract_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Fee</p>
                    <p className="font-medium">{stats.contractMonthlyFee} OMR</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires In</p>
                    <p className="font-medium">{daysUntilExpiry} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Storage Space</p>
                    <p className="font-medium">{stats.contract?.storage_space_sqm} sqm</p>
                  </div>
                </div>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/warehouse/contract")}>
                  View Full Contract Details <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">No Active Contract</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Contact your account manager to set up a warehouse storage contract.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentOrders || recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent orders</p>
                <Button variant="link" className="mt-2" onClick={() => navigate("/warehouse/orders")}>
                  Create Your First Order
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{order.order_number}</p>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString()} • {order.total_amount.toFixed(2)} OMR
                      </p>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="link" 
                  className="p-0 h-auto w-full text-center" 
                  onClick={() => navigate("/warehouse/orders")}
                >
                  View All Orders <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!lowStockItems || lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All items are well stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg border-yellow-200 bg-yellow-50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-700">{item.quantity} {item.unit}</p>
                      <p className="text-xs text-yellow-600">Low stock</p>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="link" 
                  className="p-0 h-auto w-full text-center" 
                  onClick={() => navigate("/warehouse/inventory")}
                >
                  View All Inventory <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
