import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PartnerLogoUploadProps {
  partnerId: string;
  currentLogoUrl?: string;
  onUpdate: () => void;
}

export const PartnerLogoUpload = ({ partnerId, currentLogoUrl, onUpdate }: PartnerLogoUploadProps) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("dashboard.invalidImageFormat"));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("dashboard.imageTooLarge"));
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("partner-logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("partner-logos")
        .getPublicUrl(fileName);

      // Update partner record
      const { error: updateError } = await supabase
        .from("shipping_partners")
        .update({ logo_url: publicUrl })
        .eq("id", partnerId);

      if (updateError) throw updateError;

      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split("/partner-logos/")[1];
        if (oldPath) {
          await supabase.storage.from("partner-logos").remove([oldPath]);
        }
      }

      setPreviewUrl(publicUrl);
      toast.success(t("dashboard.logoUpdated"));
      onUpdate();
    } catch (error: any) {
      toast.error(t("dashboard.logoUploadError") + ": " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    setIsUploading(true);
    try {
      // Remove from storage
      const oldPath = currentLogoUrl.split("/partner-logos/")[1];
      if (oldPath) {
        const { error: deleteError } = await supabase.storage
          .from("partner-logos")
          .remove([oldPath]);
        if (deleteError) throw deleteError;
      }

      // Update partner record
      const { error: updateError } = await supabase
        .from("shipping_partners")
        .update({ logo_url: null })
        .eq("id", partnerId);

      if (updateError) throw updateError;

      setPreviewUrl(undefined);
      toast.success(t("dashboard.logoRemoved"));
      onUpdate();
    } catch (error: any) {
      toast.error(t("dashboard.logoRemoveError") + ": " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.companyLogo")}</CardTitle>
        <CardDescription>{t("dashboard.companyLogoDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {previewUrl ? (
            <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-muted">
              <img
                src={previewUrl}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {previewUrl ? t("dashboard.changeLogo") : t("dashboard.uploadLogo")}
            </Button>
            {previewUrl && (
              <Button
                variant="outline"
                onClick={handleRemoveLogo}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                {t("dashboard.removeLogo")}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t("dashboard.logoRequirements")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
