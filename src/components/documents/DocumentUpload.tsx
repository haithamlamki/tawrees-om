import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface DocumentUploadProps {
  shipmentRequestId: string;
  onUploadComplete: () => void;
}

const DOCUMENT_TYPES = [
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "customs_declaration", label: "Customs Declaration" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "certificate_origin", label: "Certificate of Origin" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "other", label: "Other Document" },
];

const DocumentUpload = ({ shipmentRequestId, onUploadComplete }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast.error("Please select a file and document type");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload documents");
        return;
      }

      // Create unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${shipmentRequestId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("shipment-documents")
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload file");
        return;
      }

      // Create document record
      const { error: dbError } = await supabase
        .from("shipment_documents")
        .insert({
          shipment_request_id: shipmentRequestId,
          file_name: selectedFile.name,
          file_path: fileName,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          document_type: documentType,
          uploaded_by: user.id,
        });

      if (dbError) {
        console.error("Database error:", dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from("shipment-documents").remove([fileName]);
        toast.error("Failed to save document record");
        return;
      }

      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      setDocumentType("");
      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="document-type">Document Type</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger id="document-type">
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-upload">Choose File</Label>
        <Input
          id="file-upload"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !documentType || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
      </p>
    </div>
  );
};

export default DocumentUpload;
