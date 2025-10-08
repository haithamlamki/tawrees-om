import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DataExportProps {
  userId: string;
  userRole: string;
}

export const DataExport = ({ userId, userRole }: DataExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dataType, setDataType] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    if (!dataType) {
      toast.error("Please select a data type");
      return;
    }

    setIsExporting(true);

    try {
      let data: any[] = [];
      let filename = "";

      switch (dataType) {
        case "orders":
          const { data: orders } = await supabase
            .from('wms_orders')
            .select('*')
            .order('created_at', { ascending: false });
          data = orders || [];
          filename = `orders_export_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case "inventory":
          const { data: inventory } = await supabase
            .from('products')
            .select('*')
            .order('name');
          data = inventory || [];
          filename = `inventory_export_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case "invoices":
          const { data: invoices } = await supabase
            .from('wms_invoices')
            .select('*')
            .order('created_at', { ascending: false });
          data = invoices || [];
          filename = `invoices_export_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case "shipments":
          const { data: shipments } = await supabase
            .from('shipment_requests')
            .select('*')
            .order('created_at', { ascending: false });
          data = shipments || [];
          filename = `shipments_export_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        default:
          toast.error("Invalid data type");
          return;
      }

      if (data.length === 0) {
        toast.error("No data to export");
        setIsExporting(false);
        return;
      }

      if (exportFormat === "csv") {
        exportToCSV(data, filename);
      } else if (exportFormat === "json") {
        exportToJSON(data, filename);
      }

      toast.success(`Successfully exported ${data.length} records`);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  const exportToJSON = (data: any[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="shipments">Shipments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={exportData}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
