import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EnhancedMetricsProps {
  userId: string;
  userRole: string;
}

export const EnhancedMetrics = ({ userId, userRole }: EnhancedMetricsProps) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['enhanced-metrics', userId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get shipment requests data
      const { data: requests } = await supabase
        .from('shipment_requests')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get quotes data
      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get WMS orders if applicable
      const { data: wmsOrders } = await supabase
        .from('wms_orders')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate metrics
      const totalRequests = requests?.length || 0;
      const completedRequests = requests?.filter(r => r.status === 'completed').length || 0;
      const pendingRequests = requests?.filter(r => r.status === 'pending').length || 0;
      
      const totalRevenue = quotes
        ?.filter(q => q.status === 'paid')
        .reduce((sum, q) => sum + Number(q.total_sell_price || 0), 0) || 0;

      const avgDeliveryTime = requests
        ?.filter(r => r.actual_delivery_date && r.created_at)
        .map(r => {
          const created = new Date(r.created_at);
          const delivered = new Date(r.actual_delivery_date);
          return (delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        })
        .reduce((sum, days) => sum + days, 0) / (requests?.filter(r => r.actual_delivery_date).length || 1);

      const completionRate = totalRequests > 0 
        ? ((completedRequests / totalRequests) * 100).toFixed(1)
        : '0';

      return {
        totalRequests,
        completedRequests,
        pendingRequests,
        totalRevenue,
        avgDeliveryTime: avgDeliveryTime.toFixed(1),
        completionRate,
        wmsOrderCount: wmsOrders?.length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const cards = [
    {
      title: "Total Requests",
      value: metrics.totalRequests,
      icon: Package,
      description: `${metrics.pendingRequests} pending`,
      trend: metrics.totalRequests > 0 ? "up" : "neutral",
    },
    {
      title: "Completion Rate",
      value: `${metrics.completionRate}%`,
      icon: CheckCircle,
      description: `${metrics.completedRequests} completed`,
      trend: Number(metrics.completionRate) > 80 ? "up" : "down",
    },
    {
      title: "Revenue (30d)",
      value: `$${metrics.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      description: "Last 30 days",
      trend: metrics.totalRevenue > 0 ? "up" : "neutral",
    },
    {
      title: "Avg Delivery Time",
      value: `${metrics.avgDeliveryTime} days`,
      icon: Clock,
      description: "Average turnaround",
      trend: Number(metrics.avgDeliveryTime) < 14 ? "up" : "down",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {card.trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
              {card.trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
              <span>{card.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
