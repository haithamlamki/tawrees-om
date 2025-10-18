import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
}

interface SupplierSelectorProps {
  value?: string;
  onChange: (supplierId: string | undefined) => void;
  onNotesChange?: (notes: string) => void;
  notes?: string;
  label?: string;
  placeholder?: string;
}

export function SupplierSelector({
  value,
  onChange,
  onNotesChange,
  notes,
  label,
  placeholder,
}: SupplierSelectorProps) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "",
    notes: "",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
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

  const handleRequestSupplier = async () => {
    if (!requestForm.supplier_name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to request a supplier");
        return;
      }

      const { error } = await supabase
        .from("supplier_requests")
        .insert({
          customer_id: session.user.id,
          ...requestForm,
        });

      if (error) throw error;

      toast.success("Supplier request submitted successfully! An admin will review it.");
      setShowRequestDialog(false);
      setRequestForm({
        supplier_name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        country: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error requesting supplier:", error);
      toast.error("Failed to submit supplier request");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label>{label || t("common.selectSupplier")}</Label>
          <Select
            value={value || "none"}
            onValueChange={(val) => onChange(val === "none" ? undefined : val)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder || t("common.optionalSupplier")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No Supplier</span>
              </SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{supplier.supplier_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowRequestDialog(true)}
          className="mt-6"
          title="Request new supplier"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {onNotesChange && (
        <div>
          <Label>{t("common.supplierNotes")}</Label>
          <Textarea
            value={notes || ""}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add notes about this supplier for this item..."
            rows={2}
          />
        </div>
      )}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request New Supplier</DialogTitle>
            <DialogDescription>
              Submit a request to add a new supplier. An admin will review and approve it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="supplier_name">Supplier Name *</Label>
              <Input
                id="supplier_name"
                value={requestForm.supplier_name}
                onChange={(e) => setRequestForm({ ...requestForm, supplier_name: e.target.value })}
                placeholder="Enter supplier company name"
              />
            </div>

            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={requestForm.contact_person}
                onChange={(e) => setRequestForm({ ...requestForm, contact_person: e.target.value })}
                placeholder="Contact name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={requestForm.phone}
                  onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                  placeholder="+968 ..."
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={requestForm.email}
                  onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={requestForm.address}
                onChange={(e) => setRequestForm({ ...requestForm, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={requestForm.city}
                  onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={requestForm.country}
                  onChange={(e) => setRequestForm({ ...requestForm, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                placeholder="Additional information about the supplier"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestSupplier}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}