import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2, Plus } from "lucide-react";

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

interface SimpleItem {
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
  supplier_id?: string;
  supplier_notes?: string;
  image?: string;
}

interface BulkItemSupplierEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SimpleItem[];
  requestId: string;
  onUpdateComplete?: () => void;
}

export function BulkItemSupplierEditor({
  open,
  onOpenChange,
  items,
  requestId,
  onUpdateComplete,
}: BulkItemSupplierEditorProps) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>();
  const [supplierNotes, setSupplierNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  
  // New supplier form state
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [newSupplierCity, setNewSupplierCity] = useState("");
  const [newSupplierCountry, setNewSupplierCountry] = useState("");

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, supplier_name, contact_person, phone, email")
        .eq("is_active", true)
        .order("supplier_name");

      if (error) throw error;
      setSuppliers(data || []);
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
      setSelectedItems([]);
      setSelectedSupplierId(undefined);
      setSupplierNotes("");
      setShowCreateSupplier(false);
    }
  }, [open]);

  const handleToggleItem = (index: number) => {
    setSelectedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((_, index) => index));
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error(t("common.supplierName") + " is required");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          supplier_name: newSupplierName.trim(),
          contact_person: newSupplierContact.trim() || null,
          phone: newSupplierPhone.trim() || null,
          email: newSupplierEmail.trim() || null,
          address: newSupplierAddress.trim() || null,
          city: newSupplierCity.trim() || null,
          country: newSupplierCountry.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Supplier created successfully");
      setSuppliers([...suppliers, data]);
      setSelectedSupplierId(data.id);
      setShowCreateSupplier(false);
      
      // Reset form
      setNewSupplierName("");
      setNewSupplierContact("");
      setNewSupplierPhone("");
      setNewSupplierEmail("");
      setNewSupplierAddress("");
      setNewSupplierCity("");
      setNewSupplierCountry("");
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      toast.error("Failed to create supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error(t("common.noItemsSelected"));
      return;
    }

    setSaving(true);
    try {
      // Fetch current request data
      const { data: currentData, error: fetchError } = await supabase
        .from("shipment_requests")
        .select("items")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const updatedItems = Array.isArray(currentData.items) 
        ? currentData.items.map((item: any) => ({ ...item }))
        : [];

      // Update selected items with supplier info
      selectedItems.forEach((itemIndex) => {
        if (updatedItems[itemIndex]) {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            supplier_id: selectedSupplierId || null,
            supplier_notes: supplierNotes.trim() || null,
          };
        }
      });

      // Save back to database
      const { error: updateError } = await supabase
        .from("shipment_requests")
        .update({ items: updatedItems })
        .eq("id", requestId);

      if (updateError) throw updateError;

      toast.success(`Supplier updated for ${selectedItems.length} item(s)`);
      onOpenChange(false);
      onUpdateComplete?.();
    } catch (error: any) {
      console.error("Error updating items:", error);
      toast.error("Failed to update supplier information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("common.editSupplierDetails")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Items Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>{t("common.selectItems")}</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === items.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded"
                >
                  <Checkbox
                    id={`item-${index}`}
                    checked={selectedItems.includes(index)}
                    onCheckedChange={() => handleToggleItem(index)}
                  />
                  <label
                    htmlFor={`item-${index}`}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.length} × {item.width} × {item.height} cm, {item.weight} kg, Qty: {item.quantity}
                    </p>
                  </label>
                </div>
              ))}
            </div>
            {selectedItems.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedItems.length} item(s) selected
              </p>
            )}
          </div>

          {/* Supplier Selection */}
          {!showCreateSupplier ? (
            <div>
              <Label htmlFor="supplier">{t("common.selectSupplier")}</Label>
              <div className="flex gap-2 mt-1.5">
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                  disabled={loading}
                >
                  <SelectTrigger id="supplier" className="flex-1">
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}
                        {supplier.contact_person && ` - ${supplier.contact_person}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCreateSupplier(true)}
                  title={t("common.createNewSupplier")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedSupplierId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSupplierId(undefined)}
                  className="mt-2"
                >
                  Clear selection
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base">{t("common.createNewSupplier")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateSupplier(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="supplierName">{t("common.supplierName")} *</Label>
                  <Input
                    id="supplierName"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPerson">{t("common.contactPerson")}</Label>
                  <Input
                    id="contactPerson"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    placeholder="Contact person"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    placeholder="Email address"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newSupplierAddress}
                    onChange={(e) => setNewSupplierAddress(e.target.value)}
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newSupplierCity}
                    onChange={(e) => setNewSupplierCity(e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={newSupplierCountry}
                    onChange={(e) => setNewSupplierCountry(e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateSupplier}
                disabled={!newSupplierName.trim() || saving}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Supplier
              </Button>
            </div>
          )}

          {/* Supplier Notes */}
          <div>
            <Label htmlFor="notes">{t("common.supplierNotes")}</Label>
            <Textarea
              id="notes"
              value={supplierNotes}
              onChange={(e) => setSupplierNotes(e.target.value)}
              placeholder="Add notes about supplier requirements (optional)"
              rows={3}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedItems.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.applyToSelected")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
