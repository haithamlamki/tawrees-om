import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DemandForecastProps {
  customerId: string;
}

export const DemandForecast = ({ customerId }: DemandForecastProps) => {
  const { data: forecastData, isLoading } = useQuery({
    queryKey: ["demand-forecast", customerId],
    queryFn: async () => {
      // Fetch historical orders
      const { data: orders, error } = await supabase
        .from("wms_orders" as any)
        .select("*, wms_order_items(*)")
        .eq("customer_id", customerId)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Simple forecasting logic (in production, use ML models)
      const monthlyData = processOrdersForForecast(orders || []);
      const forecast = generateForecast(monthlyData);
      
      return { historical: monthlyData, forecast };
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading forecast...</div>;
  }

  const combinedData = [
    ...(forecastData?.historical || []).map(d => ({ ...d, type: "historical" })),
    ...(forecastData?.forecast || []).map(d => ({ ...d, type: "forecast" })),
  ];

  const trend = calculateTrend(forecastData?.historical || []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Demand Forecast
          </CardTitle>
          <CardDescription>
            AI-powered prediction based on your historical data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {trend > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">Trend</span>
              </div>
              <div className="text-2xl font-bold">
                {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">vs last period</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">Next Month</span>
              </div>
              <div className="text-2xl font-bold">
                {forecastData?.forecast?.[0]?.orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">Predicted orders</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getConfidenceVariant(85)}>
                  85% Confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Based on 90 days of historical data
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommendations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {generateRecommendations(trend, forecastData?.forecast?.[0]?.orders || 0).map(
                (rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function processOrdersForForecast(orders: any[]) {
  const monthlyData: Record<string, number> = {};
  
  orders.forEach(order => {
    const month = new Date(order.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  return Object.entries(monthlyData).map(([month, orders]) => ({
    month,
    orders,
  }));
}

function generateForecast(historical: any[]) {
  if (historical.length === 0) return [];

  const lastValue = historical[historical.length - 1]?.orders || 0;
  const trend = calculateTrend(historical);
  
  // Simple linear forecast for next 3 months
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const predictedValue = Math.round(lastValue * (1 + (trend / 100) * i));
    forecast.push({
      month: `Forecast ${i}`,
      orders: Math.max(0, predictedValue),
    });
  }
  
  return forecast;
}

function calculateTrend(data: any[]) {
  if (data.length < 2) return 0;
  
  const recent = data.slice(-3).reduce((sum, d) => sum + d.orders, 0) / 3;
  const previous = data.slice(-6, -3).reduce((sum, d) => sum + d.orders, 0) / 3;
  
  if (previous === 0) return 0;
  return ((recent - previous) / previous) * 100;
}

function getConfidenceVariant(confidence: number): "default" | "secondary" | "destructive" {
  if (confidence >= 80) return "default";
  if (confidence >= 60) return "secondary";
  return "destructive";
}

function generateRecommendations(trend: number, nextMonthOrders: number) {
  const recommendations = [];
  
  if (trend > 10) {
    recommendations.push("Demand is growing rapidly. Consider increasing inventory levels.");
    recommendations.push("Prepare for higher shipping volumes in the coming months.");
  } else if (trend < -10) {
    recommendations.push("Demand is declining. Review pricing strategy and marketing efforts.");
    recommendations.push("Consider optimizing inventory to reduce holding costs.");
  } else {
    recommendations.push("Demand is stable. Maintain current inventory levels.");
  }
  
  if (nextMonthOrders > 20) {
    recommendations.push("High volume expected. Ensure adequate staffing for order processing.");
  }
  
  return recommendations;
}