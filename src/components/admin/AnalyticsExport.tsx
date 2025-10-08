import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, TrendingUp } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { downloadCSV } from "@/utils/csvExport";

const AnalyticsExport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("30days");

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "90days":
        return { start: subDays(now, 90), end: now };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const exportAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const [requestsRes, quotesRes, paymentsRes, shipmentsRes] = await Promise.all([
        supabase
          .from("shipment_requests")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
        supabase
          .from("quotes")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
        supabase
          .from("payments")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
        supabase
          .from("shipments")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
      ]);

      const totalRequests = requestsRes.data?.length || 0;
      const totalQuotes = quotesRes.data?.length || 0;
      const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalShipments = shipmentsRes.data?.length || 0;

      const analyticsData = [
        { metric: "Total Requests", value: totalRequests },
        { metric: "Total Quotes", value: totalQuotes },
        { metric: "Total Revenue", value: `$${totalRevenue.toFixed(2)}` },
        { metric: "Total Shipments", value: totalShipments },
        { metric: "Conversion Rate", value: `${totalRequests > 0 ? ((totalQuotes / totalRequests) * 100).toFixed(2) : 0}%` },
        { metric: "Date Range", value: `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}` },
      ];

      downloadCSV(analyticsData, `analytics-${dateRange}-${format(new Date(), "yyyy-MM-dd")}.csv`);

      toast({
        title: "Success",
        description: "Analytics exported successfully",
      });
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast({
        title: "Error",
        description: "Failed to export analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Analytics Export
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportAnalytics} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsExport;
