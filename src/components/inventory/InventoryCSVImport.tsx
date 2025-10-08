import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InventoryCSVImportProps {
  customerId: string;
  onImportComplete: () => void;
}

export const InventoryCSVImport = ({ customerId, onImportComplete }: InventoryCSVImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const template = `product_name,sku,quantity,unit,location,notes
Example Product,SKU001,100,pcs,Warehouse A - Rack 1,Initial stock
Another Product,SKU002,50,boxes,Warehouse B - Zone 2,Fragile items`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const validateRow = (row: any, index: number): string | null => {
    if (!row.product_name) return `Row ${index + 2}: Product name is required`;
    if (!row.sku) return `Row ${index + 2}: SKU is required`;
    if (!row.quantity || isNaN(Number(row.quantity))) return `Row ${index + 2}: Valid quantity is required`;
    if (Number(row.quantity) < 0) return `Row ${index + 2}: Quantity cannot be negative`;
    return null;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        toast.error("No valid data found in file");
        setIsProcessing(false);
        return;
      }

      const validationErrors: string[] = [];
      data.forEach((row, index) => {
        const error = validateRow(row, index);
        if (error) validationErrors.push(error);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        toast.error(`Found ${validationErrors.length} validation error(s)`);
        setIsProcessing(false);
        return;
      }

      const inventoryItems = data.map(row => ({
        customer_id: customerId,
        product_name: row.product_name,
        sku: row.sku,
        quantity: Number(row.quantity),
        unit: row.unit || 'pcs',
        location: row.location || null,
        notes: row.notes || null,
        status: 'available' as const,
      }));

      const { error } = await supabase
        .from('wms_inventory')
        .insert(inventoryItems);

      if (error) throw error;

      toast.success(`Successfully imported ${inventoryItems.length} items`);
      setIsOpen(false);
      setFile(null);
      onImportComplete();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || "Failed to import inventory");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Inventory from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Download the CSV template to see the required format
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  setFile(selectedFile);
                  setErrors([]);
                }
              }}
            />
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm">{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!file || isProcessing}
              className="flex-1"
            >
              {isProcessing ? "Importing..." : "Import"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setFile(null);
                setErrors([]);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
