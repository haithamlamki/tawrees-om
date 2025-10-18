import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PartnerCompanyInfoProps {
  partnerId: string;
  companyData: {
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    tax_registration_number?: string;
  };
  onUpdate: () => void;
}

export const PartnerCompanyInfo = ({ partnerId, companyData, onUpdate }: PartnerCompanyInfoProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(companyData);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("shipping_partners")
        .update({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          tax_registration_number: formData.tax_registration_number,
        })
        .eq("id", partnerId);

      if (error) throw error;

      toast.success(t("dashboard.companyInfoUpdated"));
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(t("dashboard.companyInfoError") + ": " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(companyData);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t("dashboard.companyInformation")}
        </CardTitle>
        <CardDescription>{t("dashboard.companyInformationDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">{t("dashboard.companyName")}</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person">{t("dashboard.contactPerson")}</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("dashboard.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("dashboard.phone")}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax_registration_number">{t("dashboard.taxRegistrationNumber")}</Label>
            <Input
              id="tax_registration_number"
              value={formData.tax_registration_number || ""}
              onChange={(e) => setFormData({ ...formData, tax_registration_number: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">{t("dashboard.address")}</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={!isEditing}
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              {t("dashboard.edit")}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                {t("dashboard.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? t("dashboard.saving") : t("dashboard.save")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
