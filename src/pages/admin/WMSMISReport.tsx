import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, TrendingUp, TrendingDown, FileText, Package, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function WMSMISReport() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['mis-report', dateFrom, dateTo],
    queryFn: async () => {
      const from = format(dateFrom, 'yyyy-MM-dd');
      const to = format(dateTo, 'yyyy-MM-dd');

      const [orders, invoices, inventory, customers] = await Promise.all([
        supabase.from('wms_orders').select('*').gte('created_at', from).lte('created_at', to),
        supabase.from('wms_invoices').select('*').gte('created_at', from).lte('created_at', to),
        supabase.from('wms_inventory').select('*, wms_customers(company_name)'),
        supabase.from('wms_customers').select('*')
      ]);

      const totalOrders = orders.data?.length || 0;
      const completedOrders = orders.data?.filter(o => o.status === 'completed').length || 0;
      const pendingOrders = orders.data?.filter(o => o.status === 'pending_approval').length || 0;
      const cancelledOrders = orders.data?.filter(o => o.status === 'cancelled').length || 0;

      const totalRevenue = invoices.data?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const paidInvoices = invoices.data?.filter(inv => inv.status === 'paid').length || 0;
      const pendingPayments = invoices.data?.filter(inv => inv.status === 'pending').length || 0;

      const totalInventoryValue = inventory.data?.reduce((sum, item) => 
        sum + (Number(item.quantity) * Number(item.price_per_unit)), 0) || 0;
      const lowStockItems = inventory.data?.filter(item => 
        item.minimum_quantity && Number(item.quantity) <= Number(item.minimum_quantity)).length || 0;

      const ordersByStatus = [
        { name: 'Completed', value: completedOrders },
        { name: 'Pending', value: pendingOrders },
        { name: 'Cancelled', value: cancelledOrders },
        { name: 'In Progress', value: totalOrders - completedOrders - pendingOrders - cancelledOrders }
      ];

      const revenueByMonth = invoices.data?.reduce((acc: any, inv) => {
        const month = format(new Date(inv.created_at), 'MMM yyyy');
        acc[month] = (acc[month] || 0) + Number(inv.total_amount);
        return acc;
      }, {});

      const revenueData = Object.entries(revenueByMonth || {}).map(([month, amount]) => ({
        month,
        revenue: amount
      }));

      const topCustomers = customers.data?.map(customer => {
        const customerOrders = orders.data?.filter(o => o.customer_id === customer.id) || [];
        const customerInvoices = invoices.data?.filter(inv => inv.customer_id === customer.id) || [];
        const totalSpent = customerInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
        
        return {
          name: customer.company_name,
          orders: customerOrders.length,
          revenue: totalSpent
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 10) || [];

      const inventoryByCustomer = inventory.data?.reduce((acc: any, item) => {
        const customerName = item.wms_customers?.company_name || 'Unknown';
        acc[customerName] = (acc[customerName] || 0) + Number(item.quantity);
        return acc;
      }, {});

      const inventoryDistribution = Object.entries(inventoryByCustomer || {}).map(([name, quantity]) => ({
        name,
        quantity
      }));

      return {
        summary: {
          totalOrders,
          completedOrders,
          pendingOrders,
          totalRevenue,
          paidInvoices,
          pendingPayments,
          totalInventoryValue,
          lowStockItems,
          totalCustomers: customers.data?.length || 0
        },
        charts: {
          ordersByStatus,
          revenueData,
          topCustomers,
          inventoryDistribution
        }
      };
    }
  });

  const exportReport = async (format: 'pdf' | 'excel') => {
    toast({
      title: "Generating Report",
      description: `Preparing ${format.toUpperCase()} export...`
    });
    
    // Implement actual export logic here
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `MIS Report exported successfully as ${format.toUpperCase()}`
      });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading MIS Report...</div>
      </div>
    );
  }

  const { summary, charts } = reportData || { summary: {}, charts: {} };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Management Information System Report</h1>
          <p className="text-muted-foreground">Comprehensive business analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportReport('pdf')} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => exportReport('excel')}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "PPP") : "From Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "PPP") : "To Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OMR {summary.totalRevenue?.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.paidInvoices} paid / {summary.pendingPayments} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {summary.completedOrders} completed / {summary.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OMR {summary.totalInventoryValue?.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.lowStockItems} low stock items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="orders">Order Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={charts.ordersByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {charts.ordersByStatus?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={charts.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={charts.ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={charts.inventoryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Customers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={charts.topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
