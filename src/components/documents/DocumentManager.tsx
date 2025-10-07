import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "./DocumentUpload";
import DocumentList from "./DocumentList";
import { FileText, Upload } from "lucide-react";

interface DocumentManagerProps {
  shipmentRequestId: string;
  isAdmin?: boolean;
}

const DocumentManager = ({ shipmentRequestId, isAdmin = false }: DocumentManagerProps) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Shipment Documents</h3>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Shipment Document</DialogTitle>
                <DialogDescription>
                  Add commercial invoices, packing lists, customs declarations, and other required documents
                </DialogDescription>
              </DialogHeader>
              <DocumentUpload
                shipmentRequestId={shipmentRequestId}
                onUploadComplete={handleUploadComplete}
              />
            </DialogContent>
          </Dialog>
        </div>

        <DocumentList
          key={refreshKey}
          shipmentRequestId={shipmentRequestId}
          canDelete={isAdmin}
        />
      </CardContent>
    </Card>
  );
};

export default DocumentManager;
