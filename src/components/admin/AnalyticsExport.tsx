import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

const AnalyticsExport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("shipments");

  const convertToCSV = (data: any[], headers: string[]) => {
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header.toLowerCase().replace(/ /g, "_")];
        return `"${value || ""}"`;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportShipments = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          tracking_number,
          status,
          current_location,
          estimated_delivery,
          actual_delivery,
          created_at,
          shipment_requests (
            shipping_type,
            calculated_cost,
            profiles (
              full_name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data.map((shipment) => ({
        tracking_number: shipment.tracking_number,
        customer_name: shipment.shipment_requests?.profiles?.full_name || "N/A",
        customer_email: shipment.shipment_requests?.profiles?.email || "N/A",
        shipping_type: shipment.shipment_requests?.shipping_type || "N/A",
        cost: shipment.shipment_requests?.calculated_cost || 0,
        status: shipment.status,
        current_location: shipment.current_location || "N/A",
        estimated_delivery: shipment.estimated_delivery || "N/A",
        actual_delivery: shipment.actual_delivery || "N/A",
        created_at: new Date(shipment.created_at).toLocaleDateString(),
      }));

      const headers = [
        "Tracking Number",
        "Customer Name",
        "Customer Email",
        "Shipping Type",
        "Cost",
        "Status",
        "Current Location",
        "Estimated Delivery",
        "Actual Delivery",
        "Created At",
      ];

      const csv = convertToCSV(formatted, headers);
      downloadCSV(csv, `shipments-export-${new Date().toISOString().split("T")[0]}.csv`);

      toast({
        title: "Export successful",
        description: "Shipments data has been exported to CSV.",
      });
    } catch (error) {
      console.error("Error exporting shipments:", error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCustomers = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.from("customer_statistics").select("*");

      if (error) throw error;

      const formatted = data.map((customer) => ({
        full_name: customer.full_name || "N/A",
        email: customer.email || "N/A",
        company_name: customer.company_name || "N/A",
        total_requests: customer.total_requests || 0,
        approved_requests: customer.approved_requests || 0,
        total_shipments: customer.total_shipments || 0,
        total_spent: customer.total_spent || 0,
        last_request_date: customer.last_request_date
          ? new Date(customer.last_request_date).toLocaleDateString()
          : "N/A",
      }));

      const headers = [
        "Full Name",
        "Email",
        "Company Name",
        "Total Requests",
        "Approved Requests",
        "Total Shipments",
        "Total Spent",
        "Last Request Date",
      ];

      const csv = convertToCSV(formatted, headers);
      downloadCSV(csv, `customers-export-${new Date().toISOString().split("T")[0]}.csv`);

      toast({
        title: "Export successful",
        description: "Customer data has been exported to CSV.",
      });
    } catch (error) {
      console.error("Error exporting customers:", error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportRevenue = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("shipment_requests")
        .select("created_at, calculated_cost, status, shipping_type")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data.map((request) => ({
        date: new Date(request.created_at).toLocaleDateString(),
        shipping_type: request.shipping_type,
        amount: request.calculated_cost,
        status: request.status,
      }));

      const headers = ["Date", "Shipping Type", "Amount", "Status"];

      const csv = convertToCSV(formatted, headers);
      downloadCSV(csv, `revenue-export-${new Date().toISOString().split("T")[0]}.csv`);

      toast({
        title: "Export successful",
        description: "Revenue data has been exported to CSV.",
      });
    } catch (error) {
      console.error("Error exporting revenue:", error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    switch (reportType) {
      case "shipments":
        handleExportShipments();
        break;
      case "customers":
        handleExportCustomers();
        break;
      case "revenue":
        handleExportRevenue();
        break;
      default:
        break;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export Analytics
        </CardTitle>
        <CardDescription>Download reports in CSV format for analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Report Type</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipments">Shipments Report</SelectItem>
              <SelectItem value="customers">Customers Report</SelectItem>
              <SelectItem value="revenue">Revenue Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Report includes:</p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            {reportType === "shipments" && (
              <>
                <li>Tracking numbers and status</li>
                <li>Customer information</li>
                <li>Delivery dates and locations</li>
                <li>Shipping costs</li>
              </>
            )}
            {reportType === "customers" && (
              <>
                <li>Customer contact details</li>
                <li>Total requests and shipments</li>
                <li>Revenue per customer</li>
                <li>Last activity date</li>
              </>
            )}
            {reportType === "revenue" && (
              <>
                <li>Revenue by date</li>
                <li>Shipping type breakdown</li>
                <li>Approved requests only</li>
                <li>Transaction amounts</li>
              </>
            )}
          </ul>
        </div>

        <Button onClick={handleExport} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AnalyticsExport;
