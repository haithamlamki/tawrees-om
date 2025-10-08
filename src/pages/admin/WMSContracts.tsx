import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WMSContract, WMSCustomer } from "@/types/wms";

export default function AdminWMSContracts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<WMSContract | null>(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    contract_number: "",
    contract_type: "",
    duration_months: 12,
    monthly_fee: 0,
    storage_space_sqm: 0,
    storage_conditions: "",
    free_transfer_count: 0,
    transfer_price_after_limit: 0,
    start_date: "",
    end_date: "",
    status: "active" as "active" | "inactive" | "expired",
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["admin-wms-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_contracts")
        .select(`
          *,
          customer:wms_customers(company_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["wms-customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customers")
        .select("id, company_name, customer_code")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data as WMSCustomer[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const totalAmount = data.monthly_fee * data.duration_months;
      const { error } = await supabase.from("wms_contracts").insert({
        ...data,
        total_amount: totalAmount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wms-contracts"] });
      setOpen(false);
      resetForm();
      toast({ title: "Contract created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating contract", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const totalAmount = data.monthly_fee && data.duration_months 
        ? data.monthly_fee * data.duration_months 
        : undefined;
      const { error } = await supabase
        .from("wms_contracts")
        .update({ ...data, ...(totalAmount && { total_amount: totalAmount }) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wms-contracts"] });
      setOpen(false);
      resetForm();
      toast({ title: "Contract updated successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      customer_id: "",
      contract_number: "",
      contract_type: "",
      duration_months: 12,
      monthly_fee: 0,
      storage_space_sqm: 0,
      storage_conditions: "",
      free_transfer_count: 0,
      transfer_price_after_limit: 0,
      start_date: "",
      end_date: "",
      status: "active",
    });
    setEditingContract(null);
  };

  const handleEdit = (contract: any) => {
    setEditingContract(contract);
    setFormData({
      customer_id: contract.customer_id,
      contract_number: contract.contract_number,
      contract_type: contract.contract_type,
      duration_months: contract.duration_months,
      monthly_fee: contract.monthly_fee,
      storage_space_sqm: contract.storage_space_sqm || 0,
      storage_conditions: contract.storage_conditions || "",
      free_transfer_count: contract.free_transfer_count,
      transfer_price_after_limit: contract.transfer_price_after_limit,
      start_date: contract.start_date.split("T")[0],
      end_date: contract.end_date.split("T")[0],
      status: contract.status,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WMS Contracts</h1>
          <p className="text-muted-foreground">Manage customer contracts</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContract ? "Edit" : "Create"} Contract</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    required
                  >
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
                  <Label htmlFor="contract_number">Contract Number *</Label>
                  <Input
                    id="contract_number"
                    value={formData.contract_number}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Contract Type *</Label>
                  <Input
                    id="contract_type"
                    value={formData.contract_type}
                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_months">Duration (months) *</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_fee">Monthly Fee (OMR) *</Label>
                  <Input
                    id="monthly_fee"
                    type="number"
                    step="0.01"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage_space_sqm">Storage Space (sqm)</Label>
                  <Input
                    id="storage_space_sqm"
                    type="number"
                    value={formData.storage_space_sqm}
                    onChange={(e) => setFormData({ ...formData, storage_space_sqm: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free_transfer_count">Free Transfers *</Label>
                  <Input
                    id="free_transfer_count"
                    type="number"
                    value={formData.free_transfer_count}
                    onChange={(e) => setFormData({ ...formData, free_transfer_count: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer_price_after_limit">Transfer Fee After Limit (OMR) *</Label>
                  <Input
                    id="transfer_price_after_limit"
                    type="number"
                    step="0.01"
                    value={formData.transfer_price_after_limit}
                    onChange={(e) => setFormData({ ...formData, transfer_price_after_limit: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="storage_conditions">Storage Conditions</Label>
                  <Textarea
                    id="storage_conditions"
                    value={formData.storage_conditions}
                    onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingContract ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Start - End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts?.map((contract: any) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.contract_number}</TableCell>
                    <TableCell>{contract.customer?.company_name}</TableCell>
                    <TableCell>{contract.contract_type}</TableCell>
                    <TableCell>{contract.monthly_fee} OMR</TableCell>
                    <TableCell>{contract.duration_months} months</TableCell>
                    <TableCell className="text-sm">
                      {new Date(contract.start_date).toLocaleDateString()} -<br />
                      {new Date(contract.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contract.status)}>{contract.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(contract)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
