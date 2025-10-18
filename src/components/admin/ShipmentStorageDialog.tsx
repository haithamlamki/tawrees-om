import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ShipmentStorageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  trackingNumber: string;
  onSuccess?: () => void;
}

interface WMSCustomer {
  id: string;
  company_name: string;
  customer_code: string;
}

interface WMSContract {
  id: string;
  contract_number: string;
  customer?: { company_name: string };
  monthly_fee: number;
  storage_space_sqm?: number;
}

export function ShipmentStorageDialog({
  open,
  onOpenChange,
  shipmentId,
  trackingNumber,
  onSuccess
}: ShipmentStorageDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  
  // Existing contract data
  const [customers, setCustomers] = useState<WMSCustomer[]>([]);
  const [contracts, setContracts] = useState<WMSContract[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  
  // New contract data
  const [newContractData, setNewContractData] = useState({
    customer_id: "",
    storage_space_sqm: "",
    monthly_fee: "",
    duration_months: "12",
  });
  
  // Common storage data
  const [storageLocation, setStorageLocation] = useState("");
  const [storageNotes, setStorageNotes] = useState("");
  const [shipmentDetails, setShipmentDetails] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open, shipmentId]);

  useEffect(() => {
    if (selectedCustomerId && mode === "existing") {
      loadCustomerContracts(selectedCustomerId);
    }
  }, [selectedCustomerId, mode]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Load WMS customers
      const { data: customersData, error: customersError } = await supabase
        .from("wms_customers")
        .select("id, company_name, customer_code")
        .eq("is_active", true)
        .order("company_name");

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Load shipment details
      const { data: shipmentData, error: shipmentError } = await supabase
        .from("shipments")
        .select(`
          *,
          request:shipment_requests(
            *,
            customer:profiles(full_name, email, phone)
          )
        `)
        .eq("id", shipmentId)
        .single();

      if (shipmentError) throw shipmentError;
      setShipmentDetails(shipmentData);
    } catch (error: any) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  };

  const loadCustomerContracts = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("wms_contracts")
        .select(`
          id,
          contract_number,
          monthly_fee,
          storage_space_sqm,
          customer:wms_customers(company_name)
        `)
        .eq("customer_id", customerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      console.error("Error loading contracts:", error);
      toast.error("Failed to load contracts");
    }
  };

  const handleSubmit = async () => {
    if (mode === "existing" && !selectedContractId) {
      toast.error("Please select a contract");
      return;
    }

    if (mode === "new") {
      if (!newContractData.customer_id || !newContractData.monthly_fee) {
        toast.error("Please fill in all required fields");
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let contractId = selectedContractId;
      let customerId = selectedCustomerId;

      // Create new contract if needed
      if (mode === "new") {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + parseInt(newContractData.duration_months));

        const { data: newContract, error: contractError } = await supabase
          .from("wms_contracts")
          .insert({
            customer_id: newContractData.customer_id,
            contract_type: "storage",
            duration_months: parseInt(newContractData.duration_months),
            monthly_fee: parseFloat(newContractData.monthly_fee),
            storage_space_sqm: newContractData.storage_space_sqm ? parseFloat(newContractData.storage_space_sqm) : null,
            total_amount: parseFloat(newContractData.monthly_fee) * parseInt(newContractData.duration_months),
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: "active",
            free_transfer_count: 0,
            transfer_price_after_limit: 0,
          })
          .select()
          .single();

        if (contractError) throw contractError;
        contractId = newContract.id;
        customerId = newContractData.customer_id;
      }

      // Create shipment storage record
      const { error: storageError } = await supabase
        .from("shipment_storage")
        .insert({
          shipment_id: shipmentId,
          customer_id: customerId,
          contract_id: contractId,
          storage_location: storageLocation,
          storage_notes: storageNotes,
          storage_start_date: new Date().toISOString(),
          status: "active",
          shipment_details: shipmentDetails,
          requested_by: user.id,
          approved_by: user.id,
        });

      if (storageError) throw storageError;

      toast.success("Shipment storage created successfully");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error creating storage:", error);
      toast.error(error.message || "Failed to create storage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Store Shipment - {trackingNumber}
          </DialogTitle>
          <DialogDescription>
            Store this delivered shipment in WMS. Select an existing contract or create a new one.
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label>Storage Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="font-normal cursor-pointer">
                    Use Existing Contract
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new" className="font-normal cursor-pointer">
                    Create New Contract
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Existing Contract Mode */}
            {mode === "existing" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">WMS Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name} ({customer.customer_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCustomerId && (
                  <div className="space-y-2">
                    <Label htmlFor="contract">Active Contract *</Label>
                    <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                      <SelectTrigger id="contract">
                        <SelectValue placeholder="Select contract" />
                      </SelectTrigger>
                      <SelectContent>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.contract_number} - ${contract.monthly_fee.toFixed(2)}/month
                            {contract.storage_space_sqm && ` (${contract.storage_space_sqm} sqm)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* New Contract Mode */}
            {mode === "new" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-customer">WMS Customer *</Label>
                  <Select 
                    value={newContractData.customer_id} 
                    onValueChange={(v) => setNewContractData({ ...newContractData, customer_id: v })}
                  >
                    <SelectTrigger id="new-customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name} ({customer.customer_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly-fee">Monthly Fee ($) *</Label>
                    <Input
                      id="monthly-fee"
                      type="number"
                      step="0.01"
                      value={newContractData.monthly_fee}
                      onChange={(e) => setNewContractData({ ...newContractData, monthly_fee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (months) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newContractData.duration_months}
                      onChange={(e) => setNewContractData({ ...newContractData, duration_months: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storage-space">Storage Space (sqm)</Label>
                  <Input
                    id="storage-space"
                    type="number"
                    step="0.01"
                    value={newContractData.storage_space_sqm}
                    onChange={(e) => setNewContractData({ ...newContractData, storage_space_sqm: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="location">Storage Location</Label>
                <Input
                  id="location"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g., Warehouse A, Section B3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Storage Notes</Label>
                <Textarea
                  id="notes"
                  value={storageNotes}
                  onChange={(e) => setStorageNotes(e.target.value)}
                  placeholder="Additional notes about the storage"
                  rows={3}
                />
              </div>
            </div>

            {/* Shipment Details Preview */}
            {shipmentDetails && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm">Shipment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tracking:</span>{" "}
                    <span className="font-medium">{trackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="font-medium capitalize">{shipmentDetails.status}</span>
                  </div>
                  {shipmentDetails.request?.customer && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Customer:</span>{" "}
                      <span className="font-medium">{shipmentDetails.request.customer.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingData}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Storage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
