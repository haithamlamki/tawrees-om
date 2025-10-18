import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Save, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PartnerBankDetailsProps {
  partnerId: string;
  bankData: {
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    bank_iban?: string;
    bank_swift_code?: string;
    bank_branch?: string;
  };
  onUpdate: () => void;
}

export const PartnerBankDetails = ({ partnerId, bankData, onUpdate }: PartnerBankDetailsProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [formData, setFormData] = useState(bankData);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("shipping_partners")
        .update({
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_account_name: formData.bank_account_name,
          bank_iban: formData.bank_iban,
          bank_swift_code: formData.bank_swift_code,
          bank_branch: formData.bank_branch,
        })
        .eq("id", partnerId);

      if (error) throw error;

      toast.success(t("dashboard.bankDetailsUpdated"));
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(t("dashboard.bankDetailsError") + ": " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(bankData);
    setIsEditing(false);
  };

  const maskSensitiveData = (value?: string) => {
    if (!value || showSensitive || isEditing) return value || "";
    return "••••••••" + value.slice(-4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t("dashboard.bankDetails")}
        </CardTitle>
        <CardDescription>{t("dashboard.bankDetailsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">{t("dashboard.bankName")}</Label>
            <Input
              id="bank_name"
              value={formData.bank_name || ""}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_branch">{t("dashboard.bankBranch")}</Label>
            <Input
              id="bank_branch"
              value={formData.bank_branch || ""}
              onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_name">{t("dashboard.accountName")}</Label>
            <Input
              id="bank_account_name"
              value={formData.bank_account_name || ""}
              onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_number">{t("dashboard.accountNumber")}</Label>
            <Input
              id="bank_account_number"
              type={showSensitive || isEditing ? "text" : "password"}
              value={isEditing ? formData.bank_account_number || "" : maskSensitiveData(formData.bank_account_number)}
              onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_iban">{t("dashboard.iban")}</Label>
            <Input
              id="bank_iban"
              type={showSensitive || isEditing ? "text" : "password"}
              value={isEditing ? formData.bank_iban || "" : maskSensitiveData(formData.bank_iban)}
              onChange={(e) => setFormData({ ...formData, bank_iban: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_swift_code">{t("dashboard.swiftCode")}</Label>
            <Input
              id="bank_swift_code"
              value={formData.bank_swift_code || ""}
              onChange={(e) => setFormData({ ...formData, bank_swift_code: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSensitive(!showSensitive)}
            disabled={isEditing}
          >
            {showSensitive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                {t("dashboard.hideSensitive")}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                {t("dashboard.showSensitive")}
              </>
            )}
          </Button>
          <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
};
