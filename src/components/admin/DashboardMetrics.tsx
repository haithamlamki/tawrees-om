import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, Users, TrendingUp, Ship, CheckCircle } from "lucide-react";

interface Metrics {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalShipments: number;
  activeShipments: number;
  completedShipments: number;
  totalCustomers: number;
  pendingRequests: number;
  averageOrderValue: number;
}

const DashboardMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalShipments: 0,
    activeShipments: 0,
    completedShipments: 0,
    totalCustomers: 0,
    pendingRequests: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Load quotes for revenue and profit
      const { data: quotes } = await supabase
        .from("quotes")
        .select("total_sell_price, buy_cost, profit_amount");

      const totalRevenue = quotes?.reduce((sum, q) => sum + (q.total_sell_price || 0), 0) || 0;
      const totalProfit = quotes?.reduce((sum, q) => sum + (q.profit_amount || 0), 0) || 0;
      const totalBuyCost = quotes?.reduce((sum, q) => sum + (q.buy_cost || 0), 0) || 0;
      const profitMargin = totalBuyCost > 0 ? (totalProfit / totalBuyCost) * 100 : 0;

      // Load shipment stats
      const { data: shipments } = await supabase
        .from("shipments")
        .select("status");

      const totalShipments = shipments?.length || 0;
      const activeShipments = shipments?.filter(s => 
        s.status !== "delivered" && s.status !== "cancelled"
      ).length || 0;
      const completedShipments = shipments?.filter(s => s.status === "delivered").length || 0;

      // Load customer stats
      const { data: customers } = await supabase
        .from("profiles")
        .select("id");

      // Load pending requests
      const { data: pending } = await supabase
        .from("shipment_requests")
        .select("id")
        .eq("status", "pending");

      const averageOrderValue = quotes && quotes.length > 0
        ? totalRevenue / quotes.length
        : 0;

      setMetrics({
        totalRevenue,
        totalProfit,
        profitMargin,
        totalShipments,
        activeShipments,
        completedShipments,
        totalCustomers: customers?.length || 0,
        pendingRequests: pending?.length || 0,
        averageOrderValue,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error loading metrics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Total Revenue",
      value: `$${metrics.totalRevenue.toFixed(2)}`,
      description: "From all quotes",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Total Profit",
      value: `$${metrics.totalProfit.toFixed(2)}`,
      description: `${metrics.profitMargin.toFixed(1)}% margin`,
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "Total Shipments",
      value: metrics.totalShipments.toString(),
      description: `${metrics.activeShipments} active`,
      icon: Package,
      color: "text-purple-600",
    },
    {
      title: "Completed Deliveries",
      value: metrics.completedShipments.toString(),
      description: "Successfully delivered",
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      title: "Total Customers",
      value: metrics.totalCustomers.toString(),
      description: "Registered users",
      icon: Users,
      color: "text-orange-600",
    },
    {
      title: "Pending Requests",
      value: metrics.pendingRequests.toString(),
      description: "Awaiting approval",
      icon: Ship,
      color: "text-yellow-600",
    },
    {
      title: "Average Order Value",
      value: `$${metrics.averageOrderValue.toFixed(2)}`,
      description: "Per shipment",
      icon: DollarSign,
      color: "text-indigo-600",
    },
    {
      title: "Active Shipments",
      value: metrics.activeShipments.toString(),
      description: "In transit",
      icon: Ship,
      color: "text-cyan-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;
