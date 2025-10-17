import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Check, X, Search } from "lucide-react";
import type { Agreement, Origin, Destination, RateType, ApprovalStatus } from "@/types/locations";

interface ShippingPartner {
  id: string;
  company_name: string;
}

export default function AgreementsManagement() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [partners, setPartners] = useState<ShippingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    origin_id: "",
    destination_id: "",
    rate_type: "" as RateType,
    partner_id: null as string | null,
    buy_price: "",
    sell_price: "",
    margin_percent: "",
    min_charge: "",
    currency: "OMR",
    notes: "",
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [agreementsRes, originsRes, destinationsRes, partnersRes] = await Promise.all([
        supabase.from("agreements").select("*, origins(*), destinations(*)").order("created_at", { ascending: false }),
        supabase.from("origins").select("*").eq("active", true).order("name"),
        supabase.from("destinations").select("*").eq("active", true).order("name"),
        supabase.from("shipping_partners").select("id, company_name").eq("is_active", true).order("company_name"),
      ]);

      if (agreementsRes.error) throw agreementsRes.error;
      if (originsRes.error) throw originsRes.error;
      if (destinationsRes.error) throw destinationsRes.error;
      if (partnersRes.error) throw partnersRes.error;

      setAgreements(agreementsRes.data || []);
      setOrigins(originsRes.data || []);
      setDestinations(destinationsRes.data || []);
      setPartners(partnersRes.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load agreements data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.origin_id || !formData.destination_id || !formData.rate_type) {
        toast.error("Please fill in all required fields");
        return;
      }

      const buyPrice = parseFloat(formData.buy_price);
      const sellPrice = parseFloat(formData.sell_price);
      const marginPercent = parseFloat(formData.margin_percent);

      if (isNaN(buyPrice) || buyPrice <= 0) {
        toast.error("Buy price must be a positive number");
        return;
      }

      if (isNaN(sellPrice) || sellPrice <= 0) {
        toast.error("Sell price must be a positive number");
        return;
      }

      if (sellPrice <= buyPrice) {
        toast.error("Sell price must be greater than buy price");
        return;
      }

      if (isNaN(marginPercent) || marginPercent < 0) {
        toast.error("Margin must be a non-negative number");
        return;
      }

      const agreementData = {
        origin_id: formData.origin_id,
        destination_id: formData.destination_id,
        rate_type: formData.rate_type,
        partner_id: formData.partner_id || null,
        buy_price: buyPrice,
        sell_price: sellPrice,
        margin_percent: marginPercent,
        min_charge: formData.min_charge ? parseFloat(formData.min_charge) : null,
        currency: formData.currency,
        notes: formData.notes || null,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to || null,
        approval_status: "approved" as ApprovalStatus,
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString(),
        active: true,
      };

      if (editingAgreement) {
        const { error } = await supabase
          .from("agreements")
          .update(agreementData)
          .eq("id", editingAgreement.id);

        if (error) throw error;
        toast.success("Agreement updated successfully");
      } else {
        const { error } = await supabase.from("agreements").insert([agreementData]);
        if (error) throw error;
        toast.success("Agreement created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Error saving agreement:", error);
      toast.error(error.message || "Failed to save agreement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agreement?")) return;

    try {
      const { error } = await supabase.from("agreements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Agreement deleted successfully");
      loadData();
    } catch (error: any) {
      console.error("Error deleting agreement:", error);
      toast.error("Failed to delete agreement");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("agreements")
        .update({
          approval_status: "approved" as ApprovalStatus,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Agreement approved");
      loadData();
    } catch (error: any) {
      console.error("Error approving agreement:", error);
      toast.error("Failed to approve agreement");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;

    try {
      const { error } = await supabase
        .from("agreements")
        .update({
          approval_status: "rejected" as ApprovalStatus,
          rejection_reason: reason,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Agreement rejected");
      loadData();
    } catch (error: any) {
      console.error("Error rejecting agreement:", error);
      toast.error("Failed to reject agreement");
    }
  };

  const openEditDialog = (agreement: Agreement) => {
    setEditingAgreement(agreement);
    setFormData({
      origin_id: agreement.origin_id,
      destination_id: agreement.destination_id,
      rate_type: agreement.rate_type,
      partner_id: agreement.partner_id,
      buy_price: agreement.buy_price.toString(),
      sell_price: agreement.sell_price.toString(),
      margin_percent: agreement.margin_percent.toString(),
      min_charge: agreement.min_charge?.toString() || "",
      currency: agreement.currency,
      notes: agreement.notes || "",
      valid_from: agreement.valid_from.split('T')[0],
      valid_to: agreement.valid_to ? agreement.valid_to.split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAgreement(null);
    setFormData({
      origin_id: "",
      destination_id: "",
      rate_type: "" as RateType,
      partner_id: null,
      buy_price: "",
      sell_price: "",
      margin_percent: "",
      min_charge: "",
      currency: "OMR",
      notes: "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: "",
    });
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const variants = {
      approved: "default",
      pending_admin: "secondary",
      pending_partner: "secondary",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] as any}>{status.replace('_', ' ')}</Badge>;
  };

  const filteredAgreements = agreements.filter((agreement) => {
    const matchesSearch = 
      agreement.origins?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.destinations?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPartner = 
      partnerFilter === "all" ||
      (partnerFilter === "global" && !agreement.partner_id) ||
      agreement.partner_id === partnerFilter;

    const matchesStatus =
      statusFilter === "all" ||
      agreement.approval_status === statusFilter;

    return matchesSearch && matchesPartner && matchesStatus;
  });

  const getPartnerName = (partnerId: string | null) => {
    if (!partnerId) return "Global Rate";
    const partner = partners.find(p => p.id === partnerId);
    return partner?.company_name || "Unknown Partner";
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading agreements...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Shipping Agreements & Rates</CardTitle>
            <CardDescription>Manage global and partner-specific shipping rates</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Agreement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAgreement ? "Edit Agreement" : "Create New Agreement"}</DialogTitle>
                <DialogDescription>
                  {editingAgreement ? "Update shipping agreement details" : "Add a new global or partner-specific rate"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origin *</Label>
                    <Select value={formData.origin_id} onValueChange={(value) => setFormData({ ...formData, origin_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {origins.map((origin) => (
                          <SelectItem key={origin.id} value={origin.id}>
                            {origin.name} ({origin.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destination *</Label>
                    <Select value={formData.destination_id} onValueChange={(value) => setFormData({ ...formData, destination_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name} ({dest.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rate Type *</Label>
                    <Select value={formData.rate_type} onValueChange={(value) => setFormData({ ...formData, rate_type: value as RateType })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rate type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AIR_KG">Air Freight (per kg)</SelectItem>
                        <SelectItem value="SEA_CBM">Sea LCL (per CBM)</SelectItem>
                        <SelectItem value="SEA_CONTAINER_20">20' Container</SelectItem>
                        <SelectItem value="SEA_CONTAINER_40">40' Container</SelectItem>
                        <SelectItem value="SEA_CONTAINER_40HC">40' HC Container</SelectItem>
                        <SelectItem value="SEA_CONTAINER_45HC">45' HC Container</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Partner (Optional - Leave empty for global rate)</Label>
                    <Select value={formData.partner_id || "global"} onValueChange={(value) => setFormData({ ...formData, partner_id: value === "global" ? null : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Global rate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global Rate</SelectItem>
                        {partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Buy Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.buy_price}
                      onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sell Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Margin % *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.margin_percent}
                      onChange={(e) => setFormData({ ...formData, margin_percent: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Charge</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.min_charge}
                      onChange={(e) => setFormData({ ...formData, min_charge: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OMR">OMR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valid From *</Label>
                    <Input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid To (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.valid_to}
                      onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAgreement ? "Update" : "Create"} Agreement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by origin or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              <SelectItem value="global">Global Rates Only</SelectItem>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending_admin">Pending Admin</SelectItem>
              <SelectItem value="pending_partner">Pending Partner</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Rate Type</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Buy Price</TableHead>
                <TableHead>Sell Price</TableHead>
                <TableHead>Margin %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgreements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No agreements found. Create your first rate agreement.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell>{agreement.origins?.name}</TableCell>
                    <TableCell>{agreement.destinations?.name}</TableCell>
                    <TableCell className="text-sm">{agreement.rate_type}</TableCell>
                    <TableCell className="text-sm">{getPartnerName(agreement.partner_id)}</TableCell>
                    <TableCell>{agreement.currency} {agreement.buy_price}</TableCell>
                    <TableCell>{agreement.currency} {agreement.sell_price}</TableCell>
                    <TableCell>{agreement.margin_percent}%</TableCell>
                    <TableCell>{getStatusBadge(agreement.approval_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {agreement.approval_status === "pending_admin" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleApprove(agreement.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(agreement.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(agreement)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(agreement.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
