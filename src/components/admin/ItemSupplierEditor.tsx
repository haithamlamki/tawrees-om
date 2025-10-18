import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person: string;
  phone: string;
  email: string;
}

interface SimpleItem {
  id: string;
  productName?: string;
  length: number;
  width: number;
  height: number;
  dimensionUnit: string;
  weight: number;
  weightUnit: string;
  supplier_id?: string;
  supplier_notes?: string;
}

interface ItemSupplierEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SimpleItem;
  requestId: string;
  onUpdate: () => void;
}

export function ItemSupplierEditor({ open, onOpenChange, item, requestId, onUpdate }: ItemSupplierEditorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(item.supplier_id || "");
  const [supplierNotes, setSupplierNotes] = useState<string>(item.supplier_notes || "");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      // @ts-expect-error - Supabase type inference can be excessively deep
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, supplier_name, contact_person, phone, email")
        .eq("active", true)
        .order("supplier_name");

      if (error) throw error;
      
      setSuppliers((data || []) as Supplier[]);
    } catch (error: any) {
      console.error("Error loading suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSuppliers();
      setSelectedSupplierId(item.supplier_id || "");
      setSupplierNotes(item.supplier_notes || "");
    }
  }, [open, item.id, item.supplier_id, item.supplier_notes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch current items array
      const { data: currentRequest, error: fetchError } = await supabase
        .from("shipment_requests")
        .select("items")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      // Parse items if it's a JSON string, otherwise use as is
      let currentItems: any[] = [];
      if (currentRequest?.items) {
        currentItems = typeof currentRequest.items === 'string' 
          ? JSON.parse(currentRequest.items)
          : Array.isArray(currentRequest.items)
          ? currentRequest.items
          : [];
      }
      
      // Update the specific item
      const updatedItems = currentItems.map((i: any) => 
        i.id === item.id 
          ? { ...i, supplier_id: selectedSupplierId || undefined, supplier_notes: supplierNotes || undefined }
          : i
      );

      // Save back to database (cast to any to avoid JSON type issues)
      const { error: updateError } = await supabase
        .from("shipment_requests")
        .update({ items: updatedItems as any })
        .eq("id", requestId);

      if (updateError) throw updateError;

      toast.success("Supplier details updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      toast.error("Failed to update supplier details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Supplier Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item: {item.productName || "Unnamed Item"}</Label>
              <p className="text-sm text-muted-foreground">
                {item.length} × {item.width} × {item.height} {item.dimensionUnit}, {item.weight} {item.weightUnit}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={selectedSupplierId || undefined} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name} - {supplier.contact_person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSupplierId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSupplierId("")}
                  className="text-xs"
                >
                  Clear selection
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Supplier Notes</Label>
              <Textarea
                id="notes"
                value={supplierNotes}
                onChange={(e) => setSupplierNotes(e.target.value)}
                placeholder="Add any special notes for this supplier..."
                rows={4}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
