import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface RevenueData {
  period: string;
  revenue: number;
  profit: number;
  cost: number;
}

const RevenueChart = () => {
  const [data, setData] = useState<RevenueData[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [timeRange]);

  const loadRevenueData = async () => {
    setLoading(true);
    
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const { data: quotes } = await supabase
      .from("quotes")
      .select("created_at, total_sell_price, buy_cost, profit_amount")
      .gte("created_at", startDate.toISOString())
      .order("created_at");

    if (!quotes) {
      setLoading(false);
      return;
    }

    // Group by date
    const grouped = quotes.reduce((acc: Record<string, RevenueData>, quote) => {
      const date = new Date(quote.created_at);
      const key = timeRange === "1y" 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().split('T')[0];

      if (!acc[key]) {
        acc[key] = {
          period: key,
          revenue: 0,
          profit: 0,
          cost: 0,
        };
      }

      acc[key].revenue += quote.total_sell_price || 0;
      acc[key].profit += quote.profit_amount || 0;
      acc[key].cost += quote.buy_cost || 0;

      return acc;
    }, {});

    const chartData = Object.values(grouped).map(item => ({
      ...item,
      period: timeRange === "1y" 
        ? new Date(item.period).toLocaleDateString('default', { month: 'short', year: 'numeric' })
        : new Date(item.period).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
    }));

    setData(chartData);
    setLoading(false);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue & Profit Overview</CardTitle>
            <CardDescription>Track your financial performance over time</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
              <Bar dataKey="profit" fill="hsl(142, 76%, 36%)" name="Profit" />
              <Bar dataKey="cost" fill="hsl(var(--muted-foreground))" name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
