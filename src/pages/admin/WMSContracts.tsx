import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WMSContract, WMSCustomer } from "@/types/wms";

export default function AdminWMSContracts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<WMSContract | null>(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    network_name: "",
    email: "",
    phone: "",
    responsible_person: "",
    address: "",
    gateway_username: "",
    gateway_password: "",
    create_account: false,
    contract_number: "",
    contract_type: "",
    contract_date: "",
    duration_months: 12,
    monthly_fee: 0,
    storage_space_sqm: 0,
    storage_conditions: "",
    free_transfer_count: 0,
    transfer_price_after_limit: 0,
    start_date: "",
    end_date: "",
    status: "active" as "active" | "inactive" | "expired",
    notes: "",
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
      toast({ title: t("admin.contracts.createContract") + " " + t("common.success") });
    },
    onError: (error) => {
      toast({ 
        title: t("common.error"), 
        description: error.message, 
        variant: "destructive" 
      });
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
      toast({ title: t("admin.contracts.editContract") + " " + t("common.success") });
    },
  });

  const resetForm = () => {
    setFormData({
      customer_id: "",
      network_name: "",
      email: "",
      phone: "",
      responsible_person: "",
      address: "",
      gateway_username: "",
      gateway_password: "",
      create_account: false,
      contract_number: "",
      contract_type: "",
      contract_date: "",
      duration_months: 12,
      monthly_fee: 0,
      storage_space_sqm: 0,
      storage_conditions: "",
      free_transfer_count: 0,
      transfer_price_after_limit: 0,
      start_date: "",
      end_date: "",
      status: "active",
      notes: "",
    });
    setEditingContract(null);
  };

  const handleEdit = (contract: any) => {
    setEditingContract(contract);
    setFormData({
      customer_id: contract.customer_id,
      network_name: contract.network_name || "",
      email: contract.email || "",
      phone: contract.phone || "",
      responsible_person: contract.responsible_person || "",
      address: contract.address || "",
      gateway_username: contract.gateway_username || "",
      gateway_password: contract.gateway_password || "",
      create_account: contract.create_account || false,
      contract_number: contract.contract_number,
      contract_type: contract.contract_type,
      contract_date: contract.contract_date ? contract.contract_date.split("T")[0] : "",
      duration_months: contract.duration_months,
      monthly_fee: contract.monthly_fee,
      storage_space_sqm: contract.storage_space_sqm || 0,
      storage_conditions: contract.storage_conditions || "",
      free_transfer_count: contract.free_transfer_count,
      transfer_price_after_limit: contract.transfer_price_after_limit,
      start_date: contract.start_date.split("T")[0],
      end_date: contract.end_date.split("T")[0],
      status: contract.status,
      notes: contract.notes || "",
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
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "expired": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.contracts.title")}</h1>
          <p className="text-muted-foreground">{t("admin.contracts.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.contracts.newContract")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContract ? t("admin.contracts.editContract") : t("admin.contracts.createContract")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t("admin.contracts.clientDetails")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="customer_id">{t("admin.contracts.customer")} *</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.contracts.customer")} />
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
                    <Label htmlFor="network_name">{t("admin.contracts.networkName")}</Label>
                    <Input
                      id="network_name"
                      value={formData.network_name}
                      onChange={(e) => setFormData({ ...formData, network_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("admin.contracts.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("admin.contracts.phone")}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible_person">{t("admin.contracts.responsiblePerson")}</Label>
                    <Input
                      id="responsible_person"
                      value={formData.responsible_person}
                      onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">{t("admin.contracts.address")}</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Gateway Login Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t("admin.contracts.gatewayLogin")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gateway_username">{t("admin.contracts.username")}</Label>
                    <Input
                      id="gateway_username"
                      value={formData.gateway_username}
                      onChange={(e) => setFormData({ ...formData, gateway_username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gateway_password">{t("admin.contracts.password")}</Label>
                    <Input
                      id="gateway_password"
                      type="password"
                      value={formData.gateway_password}
                      onChange={(e) => setFormData({ ...formData, gateway_password: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex items-center space-x-2">
                    <Checkbox
                      id="create_account"
                      checked={formData.create_account}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, create_account: checked as boolean })
                      }
                    />
                    <Label htmlFor="create_account" className="cursor-pointer">
                      {t("admin.contracts.createAccount")}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Contract Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t("admin.contracts.contractDetails")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract_type">{t("admin.contracts.contractType")} *</Label>
                    <Input
                      id="contract_type"
                      value={formData.contract_type}
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_date">{t("admin.contracts.contractDate")}</Label>
                    <Input
                      id="contract_date"
                      type="date"
                      value={formData.contract_date}
                      onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_number">{t("admin.contracts.contractNumber")} *</Label>
                    <Input
                      id="contract_number"
                      value={formData.contract_number}
                      onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_fee">{t("admin.contracts.monthlySubscription")} *</Label>
                    <Input
                      id="monthly_fee"
                      type="number"
                      step="0.001"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage_space_sqm">{t("admin.contracts.storageSpace")}</Label>
                    <Input
                      id="storage_space_sqm"
                      type="number"
                      value={formData.storage_space_sqm}
                      onChange={(e) => setFormData({ ...formData, storage_space_sqm: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="free_transfer_count">{t("admin.contracts.transferCount")} *</Label>
                    <Input
                      id="free_transfer_count"
                      type="number"
                      value={formData.free_transfer_count}
                      onChange={(e) => setFormData({ ...formData, free_transfer_count: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer_price_after_limit">{t("admin.contracts.transferPrice")} *</Label>
                    <Input
                      id="transfer_price_after_limit"
                      type="number"
                      step="0.001"
                      value={formData.transfer_price_after_limit}
                      onChange={(e) => setFormData({ ...formData, transfer_price_after_limit: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_months">{t("admin.contracts.duration")} *</Label>
                    <Input
                      id="duration_months"
                      type="number"
                      value={formData.duration_months}
                      onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">{t("admin.contracts.startDate")} *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">{t("admin.contracts.endDate")} *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">{t("admin.contracts.status")} *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t("admin.contracts.active")}</SelectItem>
                        <SelectItem value="inactive">{t("admin.contracts.inactive")}</SelectItem>
                        <SelectItem value="expired">{t("admin.contracts.expired")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="storage_conditions">{t("admin.contracts.storageConditions")}</Label>
                    <Textarea
                      id="storage_conditions"
                      value={formData.storage_conditions}
                      onChange={(e) => setFormData({ ...formData, storage_conditions: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">{t("admin.contracts.notes")}</h3>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t("admin.contracts.notesPlaceholder")}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("admin.contracts.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingContract ? t("admin.contracts.update") : t("admin.contracts.create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.contracts.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.contracts.contractNumber")}</TableHead>
                  <TableHead>{t("admin.contracts.customer")}</TableHead>
                  <TableHead>{t("admin.contracts.type")}</TableHead>
                  <TableHead>{t("admin.contracts.monthlyFee")}</TableHead>
                  <TableHead>{t("admin.contracts.duration")}</TableHead>
                  <TableHead>{t("admin.contracts.startDate")} - {t("admin.contracts.endDate")}</TableHead>
                  <TableHead>{t("admin.contracts.status")}</TableHead>
                  <TableHead>{t("admin.contracts.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts?.map((contract: any) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.contract_number}</TableCell>
                    <TableCell>{contract.customer?.company_name}</TableCell>
                    <TableCell>{contract.contract_type}</TableCell>
                    <TableCell>{contract.monthly_fee} OMR</TableCell>
                    <TableCell>{contract.duration_months} {t("admin.contracts.months")}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(contract.start_date).toLocaleDateString()} -<br />
                      {new Date(contract.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contract.status)}>
                        {t(`admin.contracts.${contract.status}`)}
                      </Badge>
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