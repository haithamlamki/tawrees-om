import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Partner {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
}

const PartnerManagement = () => {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_partners")
        .select("*")
        .order("company_name");

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error("Error loading partners:", error);
      toast({
        title: "Error",
        description: "Failed to load partners",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPartner) {
        const { error } = await supabase
          .from("shipping_partners")
          .update(formData)
          .eq("id", editingPartner.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Partner updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("shipping_partners")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Partner created successfully",
        });
      }

      setDialogOpen(false);
      setEditingPartner(null);
      setFormData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
      });
      loadPartners();
    } catch (error) {
      console.error("Error saving partner:", error);
      toast({
        title: "Error",
        description: "Failed to save partner",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePartnerStatus = async (partner: Partner) => {
    try {
      const { error } = await supabase
        .from("shipping_partners")
        .update({ is_active: !partner.is_active })
        .eq("id", partner.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Partner ${!partner.is_active ? "activated" : "deactivated"}`,
      });
      loadPartners();
    } catch (error) {
      console.error("Error updating partner status:", error);
      toast({
        title: "Error",
        description: "Failed to update partner status",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      company_name: partner.company_name,
      contact_person: partner.contact_person || "",
      email: partner.email || "",
      phone: partner.phone || "",
      address: partner.address || "",
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shipping Partners
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPartner(null);
                setFormData({
                  company_name: "",
                  contact_person: "",
                  email: "",
                  phone: "",
                  address: "",
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPartner ? "Edit Partner" : "Add New Partner"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {editingPartner ? "Update" : "Create"} Partner
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {partners.map((partner) => (
            <div key={partner.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{partner.company_name}</h3>
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {partner.contact_person && (
                    <p className="text-sm text-muted-foreground">Contact: {partner.contact_person}</p>
                  )}
                  {partner.email && (
                    <p className="text-sm text-muted-foreground">Email: {partner.email}</p>
                  )}
                  {partner.phone && (
                    <p className="text-sm text-muted-foreground">Phone: {partner.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(partner)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePartnerStatus(partner)}
                  >
                    {partner.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PartnerManagement;
