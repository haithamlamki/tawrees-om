import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QualityCheckPhotosProps {
  qcId: string;
  photos: any[];
  onPhotosUpdated: () => void;
}

export const QualityCheckPhotos = ({ qcId, photos, onPhotosUpdated }: QualityCheckPhotosProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${qcId}-${Date.now()}.${fileExt}`;
        const filePath = `qc-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('shipment-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('qc_photos')
          .insert({
            qc_id: qcId,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (dbError) throw dbError;
      }

      toast.success("Photos uploaded successfully");
      onPhotosUpdated();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('shipment-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('qc_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      toast.success("Photo deleted");
      onPhotosUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete photo");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Quality Check Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            type="file"
            id="photo-upload"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="photo-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="w-full"
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Photos"}
            </Button>
          </label>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={`${supabase.storage.from('shipment-documents').getPublicUrl(photo.file_path).data.publicUrl}`}
                    alt={photo.file_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeletePhoto(photo.id, photo.file_path)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};