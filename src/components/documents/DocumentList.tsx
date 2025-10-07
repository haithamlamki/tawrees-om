import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Download, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  created_at: string;
}

interface DocumentListProps {
  shipmentRequestId: string;
  canDelete?: boolean;
}

const DocumentList = ({ shipmentRequestId, canDelete = false }: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [shipmentRequestId]);

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("shipment_documents")
      .select("*")
      .eq("shipment_request_id", shipmentRequestId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
      return;
    }

    setDocuments(data || []);
    setLoading(false);
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("shipment-documents")
        .download(document.file_path);

      if (error) {
        console.error("Download error:", error);
        toast.error("Failed to download document");
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Document downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("An error occurred during download");
    }
  };

  const handleView = async (document: Document) => {
    try {
      const { data } = await supabase.storage
        .from("shipment-documents")
        .createSignedUrl(document.file_path, 60); // 60 seconds expiry

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("View error:", error);
      toast.error("Failed to open document");
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete ${document.file_name}?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("shipment-documents")
        .remove([document.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("shipment_documents")
        .delete()
        .eq("id", document.id);

      if (dbError) {
        console.error("Database delete error:", dbError);
        toast.error("Failed to delete document");
        return;
      }

      toast.success("Document deleted");
      loadDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An error occurred during deletion");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.file_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {formatDocumentType(doc.document_type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(doc)}
              title="View document"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(doc)}
              title="Download document"
            >
              <Download className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc)}
                title="Delete document"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentList;
