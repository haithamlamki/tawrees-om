import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCSV } from "@/utils/csvExport";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CSVImportDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreview(parsed.slice(0, 5)); // Show first 5 rows
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !preview) {
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const data = parseCSV(text);

        // Validate required fields
        const requiredFields = ["origin", "destination", "rate_type", "buy_price", "sell_price"];
        const hasRequiredFields = requiredFields.every((field) =>
          data.length > 0 && field in data[0]
        );

        if (!hasRequiredFields) {
          toast({
            title: "Invalid CSV",
            description: `CSV must contain columns: ${requiredFields.join(", ")}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Get origins and destinations for lookup
        const { data: origins } = await supabase.from("origins").select("id, name");
        const { data: destinations } = await supabase.from("destinations").select("id, name");

        const originMap = new Map(origins?.map((o) => [o.name.toLowerCase(), o.id]));
        const destMap = new Map(destinations?.map((d) => [d.name.toLowerCase(), d.id]));

        // Transform data for import
        const agreementsToInsert = data
          .map((row) => {
            const originId = originMap.get(row.origin?.toLowerCase());
            const destId = destMap.get(row.destination?.toLowerCase());

            if (!originId || !destId) {
              console.warn(`Skipping row: origin or destination not found`, row);
              return null;
            }

            const marginPercent =
              row.margin_percent !== undefined
                ? parseFloat(row.margin_percent)
                : ((parseFloat(row.sell_price) - parseFloat(row.buy_price)) /
                    parseFloat(row.buy_price)) *
                  100;

            return {
              origin_id: originId,
              destination_id: destId,
              rate_type: row.rate_type,
              buy_price: parseFloat(row.buy_price),
              sell_price: parseFloat(row.sell_price),
              margin_percent: marginPercent,
              min_charge: row.min_charge ? parseFloat(row.min_charge) : null,
              currency: row.currency || "USD",
              active: row.active !== undefined ? row.active : true,
              valid_from: row.valid_from || new Date().toISOString(),
              valid_to: row.valid_to || null,
              notes: row.notes || null,
            };
          })
          .filter((row) => row !== null);

        if (agreementsToInsert.length === 0) {
          toast({
            title: "No valid data",
            description: "No valid agreements found in CSV",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.from("agreements").insert(agreementsToInsert);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Imported ${agreementsToInsert.length} agreements successfully`,
        });

        setOpen(false);
        setFile(null);
        setPreview(null);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast({
        title: "Error",
        description: "Failed to import CSV. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Rates from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: origin, destination, rate_type, buy_price, sell_price,
            margin_percent (optional), min_charge (optional), currency (optional), active (optional),
            notes (optional)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          {preview && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.values(row).map((value: any, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview && (
            <Alert>
              <AlertDescription>
                Ready to import {preview.length}+ agreements. Make sure origins and destinations exist
                in the system.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={loading || !preview}>
              {loading ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
