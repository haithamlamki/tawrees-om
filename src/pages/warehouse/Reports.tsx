import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Package, DollarSign, Calendar, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function WMSReports() {
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();
  const [timeRange, setTimeRange] = useState("30");

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["wms-orders-analytics", customer?.id, timeRange],
    queryFn: async () => {
      if (!customer?.id) return [];
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));
      
      const { data, error } = await supabase
        .from("wms_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["wms-invoices-analytics", customer?.id, timeRange],
    queryFn: async () => {
      if (!customer?.id) return [];
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));
      
      const { data, error } = await supabase
        .from("wms_invoices")
        .select("*")
        .eq("customer_id", customer.id)
        .gte("created_at", daysAgo.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["wms-inventory-analytics", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("wms_inventory")
        .select("*")
        .eq("customer_id", customer.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  if (customerLoading || ordersLoading || invoicesLoading || inventoryLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not linked to any warehouse customer.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate metrics
  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === "completed").length || 0;
  const totalSpent = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const pendingAmount = invoices?.filter(i => i.status === "pending").reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const totalInventoryValue = inventory?.reduce((sum, item) => sum + (Number(item.price_per_unit || 0) * Number(item.quantity)), 0) || 0;
  const lowStockItems = inventory?.filter(item => item.status === "low").length || 0;

  // Compare with previous period
  const prevPeriodStart = new Date();
  prevPeriodStart.setDate(prevPeriodStart.getDate() - (parseInt(timeRange) * 2));
  const prevPeriodEnd = new Date();
  prevPeriodEnd.setDate(prevPeriodEnd.getDate() - parseInt(timeRange));

  const prevOrders = orders?.filter(o => {
    const orderDate = new Date(o.created_at);
    return orderDate >= prevPeriodStart && orderDate < prevPeriodEnd;
  }).length || 0;

  const ordersTrend = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders * 100) : 0;

  // Prepare chart data - Orders by day
  const ordersByDay = orders?.reduce((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ordersChartData = Object.entries(ordersByDay || {}).map(([date, count]) => ({
    date,
    orders: count,
  }));

  // Prepare chart data - Spending by day
  const spendingByDay = invoices?.reduce((acc, invoice) => {
    const date = new Date(invoice.invoice_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + Number(invoice.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const spendingChartData = Object.entries(spendingByDay || {}).map(([date, amount]) => ({
    date,
    spending: amount,
  }));

  // Order status distribution
  const statusDistribution = orders?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(statusDistribution || {}).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  // Inventory status distribution
  const inventoryStatusData = [
    { name: 'Available', value: inventory?.filter(i => i.status === 'available').length || 0 },
    { name: 'Low Stock', value: inventory?.filter(i => i.status === 'low').length || 0 },
    { name: 'Out of Stock', value: inventory?.filter(i => i.status === 'out_of_stock').length || 0 },
  ];

  const handleExport = () => {
    console.log("Exporting report data...");
    // Placeholder for export functionality
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Insights into your warehouse operations</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {ordersTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={ordersTrend >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(ordersTrend).toFixed(1)}%
              </span>
              <span>vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSpent.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedOrders} completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {pendingAmount.toFixed(2)} OMR
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInventoryValue.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockItems} items low stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
            <CardDescription>Daily order volume for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ordersChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>Daily spending for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="spending" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Breakdown by order status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Stock level distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventoryStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {inventoryStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
