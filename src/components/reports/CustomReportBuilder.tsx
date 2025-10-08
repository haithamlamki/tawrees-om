import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const CustomReportBuilder = () => {
  const [reportType, setReportType] = useState<string>("inventory");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [groupBy, setGroupBy] = useState<string>("day");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("Please select date range");
      return;
    }

    setIsGenerating(true);
    try {
      let data: any[] = [];

      if (reportType === "wms_orders") {
        const { data: ordersData, error } = await supabase
          .from("wms_orders" as any)
          .select("*")
          .gte("created_at", dateFrom.toISOString())
          .lte("created_at", dateTo.toISOString());
        
        if (error) throw error;
        data = ordersData || [];
      } else if (reportType === "wms_invoices") {
        const { data: invoicesData, error } = await supabase
          .from("wms_invoices" as any)
          .select("*")
          .gte("created_at", dateFrom.toISOString())
          .lte("created_at", dateTo.toISOString());
        
        if (error) throw error;
        data = invoicesData || [];
      } else if (reportType === "wms_inventory") {
        const { data: inventoryData, error } = await supabase
          .from("wms_inventory" as any)
          .select("*")
          .gte("created_at", dateFrom.toISOString())
          .lte("created_at", dateTo.toISOString());
        
        if (error) throw error;
        data = inventoryData || [];
      } else {
        const { data: shipmentsData, error } = await supabase
          .from("shipments")
          .select("*")
          .gte("created_at", dateFrom.toISOString())
          .lte("created_at", dateTo.toISOString());
        
        if (error) throw error;
        data = shipmentsData || [];
      }

      if (!data || data.length === 0) {
        toast.info("No data found for selected criteria");
        return;
      }

      // Generate CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            const stringValue = value === null || value === undefined ? "" : String(value);
            return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
          }).join(",")
        )
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report generated successfully");
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast.error(error.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wms_orders">Orders</SelectItem>
                <SelectItem value="wms_inventory">Inventory</SelectItem>
                <SelectItem value="wms_invoices">Invoices</SelectItem>
                <SelectItem value="shipments">Shipments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Group By</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button 
          onClick={generateReport} 
          disabled={isGenerating || !dateFrom || !dateTo}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Report"}
        </Button>
      </CardContent>
    </Card>
  );
};