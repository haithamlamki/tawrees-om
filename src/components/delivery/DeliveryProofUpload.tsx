import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Image as ImageIcon, Signature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface DeliveryProofUploadProps {
  shipmentId: string;
  onProofUploaded: () => void;
}

export const DeliveryProofUpload = ({ shipmentId, onProofUploaded }: DeliveryProofUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${shipmentId}-delivery-${Date.now()}.${fileExt}`;
      const filePath = `delivery-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('wms-delivery-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wms-delivery-proofs')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('shipments')
        .update({ delivery_photo_url: publicUrl })
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      toast.success("Delivery photo uploaded");
      onProofUploaded();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${shipmentId}-signature-${Date.now()}.${fileExt}`;
      const filePath = `delivery-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('wms-delivery-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wms-delivery-proofs')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('shipments')
        .update({ delivery_signature_url: publicUrl })
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      toast.success("Signature uploaded");
      onProofUploaded();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload signature");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Delivery Proof
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Delivery Photo</Label>
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            className="w-full"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Customer Signature</Label>
          <input
            type="file"
            id="signature-upload"
            accept="image/*"
            onChange={handleSignatureUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            className="w-full"
            onClick={() => document.getElementById('signature-upload')?.click()}
          >
            <Signature className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Signature"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};