import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportError {
  row: number;
  error: string;
}

export function InventoryExcelImportAdmin() {
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: ImportError[];
  } | null>(null);

  const { data: customers } = useQuery({
    queryKey: ["wms-customers-for-import"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customers")
        .select("id, company_name, customer_code")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        setFile(selectedFile);
        setImportResult(null);
      } else {
        toast.error("Please select an Excel file (.xlsx or .xls)");
      }
    }
  };

  const handleImport = async () => {
    if (!file || !selectedCustomer) {
      toast.error("Please select a customer and file");
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', selectedCustomer);

      const { data, error } = await supabase.functions.invoke('import-inventory-excel', {
        body: formData,
      });

      if (error) throw error;

      setImportResult({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });

      if (data.success > 0) {
        toast.success(`Successfully imported ${data.success} items`);
        if (data.failed === 0) {
          setTimeout(() => {
            setOpen(false);
            window.location.reload();
          }, 2000);
        }
      }

      if (data.failed > 0) {
        toast.error(`Failed to import ${data.failed} items. See details below.`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || "Failed to import inventory");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ["product_name", "sku", "quantity", "unit", "category", "price_per_unit", "minimum_quantity", "description", "image_url", "status"],
      ["Example Product", "SKU-001", "100", "pcs", "Electronics", "25.50", "10", "Sample description", "", "available"],
      ["Another Product", "SKU-002", "50", "boxes", "Furniture", "150.00", "5", "Another example", "", "low"],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wms_inventory_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Inventory from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import inventory items. Download the template for the correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name} ({customer.customer_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excel-file">Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>

          {importResult && (
            <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Import Results:</strong></p>
                  <p>✓ Successfully imported: {importResult.success} items</p>
                  {importResult.failed > 0 && (
                    <>
                      <p>✗ Failed: {importResult.failed} items</p>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          <p className="font-semibold">Errors:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {importResult.errors.map((err, idx) => (
                              <li key={idx} className="text-sm">
                                Row {err.row}: {err.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || !selectedCustomer || loading}>
            {loading ? "Importing..." : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
