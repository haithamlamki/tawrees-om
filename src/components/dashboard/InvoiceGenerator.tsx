import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";

interface InvoiceGeneratorProps {
  requestId: string;
  requestStatus: string;
}

const InvoiceGenerator = ({ requestId, requestStatus }: InvoiceGeneratorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerateInvoice = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { requestId },
      });

      if (error) throw error;

      if (!data?.html) {
        throw new Error("Failed to generate invoice");
      }

      // Open invoice in new window for printing/saving
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
      }

      toast({
        title: "Invoice generated",
        description: "Your invoice is ready to print or save as PDF.",
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { requestId },
      });

      if (error) throw error;

      if (!data?.html) {
        throw new Error("Failed to generate invoice");
      }

      // Create a blob and download
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${requestId.slice(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Invoice downloaded",
        description: "Invoice has been saved to your device.",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show for approved requests
  if (requestStatus !== "approved" && requestStatus !== "completed") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerateInvoice}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        View Invoice
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download
      </Button>
    </div>
  );
};

export default InvoiceGenerator;
