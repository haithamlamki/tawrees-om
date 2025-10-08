import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, Users, FileText, Truck, ShoppingCart, DollarSign, Settings, TrendingUp } from "lucide-react";

export default function WMSDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["wms-dashboard-stats"],
    queryFn: async () => {
      const [customers, inventory, orders, invoices] = await Promise.all([
        supabase.from("wms_customers").select("id, is_active"),
        supabase.from("wms_inventory").select("id, quantity, price_per_unit"),
        supabase.from("wms_orders").select("id, status, total_amount"),
        supabase.from("wms_invoices").select("id, status, total_amount"),
      ]);

      const activeCustomers = customers.data?.filter((c) => c.is_active).length || 0;
      const totalInventoryValue =
        inventory.data?.reduce((sum, item) => sum + (item.price_per_unit || 0) * item.quantity, 0) || 0;
      const pendingOrders = orders.data?.filter((o) => o.status === "pending_approval").length || 0;
      const pendingInvoices = invoices.data?.filter((i) => i.status === "pending").length || 0;
      const totalRevenue =
        invoices.data?.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total_amount, 0) || 0;

      return {
        totalCustomers: customers.data?.length || 0,
        activeCustomers,
        totalInventoryItems: inventory.data?.length || 0,
        totalInventoryValue,
        totalOrders: orders.data?.length || 0,
        pendingOrders,
        totalInvoices: invoices.data?.length || 0,
        pendingInvoices,
        totalRevenue,
      };
    },
  });

  const quickActions = [
    { title: "Customers", icon: Users, path: "/admin/wms-customers", color: "text-blue-500" },
    { title: "Inventory", icon: Package, path: "/admin/wms-inventory", color: "text-green-500" },
    { title: "Orders", icon: ShoppingCart, path: "/admin/wms-orders", color: "text-purple-500" },
    { title: "Invoices", icon: FileText, path: "/admin/wms-invoices", color: "text-orange-500" },
    { title: "Contracts", icon: FileText, path: "/admin/wms-contracts", color: "text-teal-500" },
    { title: "Drivers", icon: Truck, path: "/admin/wms-drivers", color: "text-indigo-500" },
    { title: "Workflow", icon: Settings, path: "/admin/wms-workflow", color: "text-gray-500" },
  ];

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">WMS Dashboard</h1>
        <p className="text-muted-foreground">Warehouse Management System Overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeCustomers || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInventoryValue.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalInventoryItems || 0} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalOrders || 0} total orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRevenue.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingInvoices || 0} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => navigate(action.path)}
              >
                <action.icon className={`h-6 w-6 ${action.color}`} />
                <span className="text-sm">{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Orders Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending Approval</span>
                <span className="font-medium">{stats?.pendingOrders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Orders</span>
                <span className="font-medium">{stats?.totalOrders || 0}</span>
              </div>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/admin/wms-orders")}
              >
                View All Orders →
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending Payment</span>
                <span className="font-medium">{stats?.pendingInvoices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Invoices</span>
                <span className="font-medium">{stats?.totalInvoices || 0}</span>
              </div>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/admin/wms-invoices")}
              >
                View All Invoices →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
