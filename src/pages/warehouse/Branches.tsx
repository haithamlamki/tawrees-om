import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { WMSCustomerBranch } from "@/types/wms";

export default function WMSBranches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<WMSCustomerBranch | null>(null);
  const [formData, setFormData] = useState({
    branch_name: "",
    branch_code: "",
    address: "",
    city: "",
    phone: "",
    is_main_branch: false,
  });

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["wms-branches", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("wms_customer_branches")
        .select("*")
        .eq("customer_id", customer.id)
        .order("is_main_branch", { ascending: false });
      if (error) throw error;
      return data as WMSCustomerBranch[];
    },
    enabled: !!customer?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("wms_customer_branches").insert({
        ...data,
        customer_id: customer!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-branches"] });
      setOpen(false);
      resetForm();
      toast({ title: "Branch created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating branch", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase.from("wms_customer_branches").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-branches"] });
      setOpen(false);
      resetForm();
      toast({ title: "Branch updated successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      branch_name: "",
      branch_code: "",
      address: "",
      city: "",
      phone: "",
      is_main_branch: false,
    });
    setEditingBranch(null);
  };

  const handleEdit = (branch: WMSCustomerBranch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      address: branch.address,
      city: branch.city,
      phone: branch.phone || "",
      is_main_branch: branch.is_main_branch,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (customerLoading || branchesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not linked to any warehouse customer.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branches</h1>
          <p className="text-muted-foreground">Manage your warehouse branches</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBranch ? "Edit" : "Add"} Branch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name *</Label>
                  <Input
                    id="branch_name"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_code">Branch Code *</Label>
                  <Input
                    id="branch_code"
                    value={formData.branch_code}
                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="is_main_branch"
                    checked={formData.is_main_branch}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_main_branch: checked })}
                  />
                  <Label htmlFor="is_main_branch">Main Branch</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingBranch ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Branches</CardTitle>
        </CardHeader>
        <CardContent>
          {!branches || branches.length === 0 ? (
            <p className="text-muted-foreground">No branches yet. Add your first branch.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.branch_name}</TableCell>
                    <TableCell>{branch.branch_code}</TableCell>
                    <TableCell>{branch.city}</TableCell>
                    <TableCell>{branch.phone || "-"}</TableCell>
                    <TableCell>{branch.address}</TableCell>
                    <TableCell>
                      {branch.is_main_branch ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Main</span>
                      ) : (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Branch</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(branch)}>
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
