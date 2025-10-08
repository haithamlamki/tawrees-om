import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Eye, CheckCircle } from "lucide-react";

interface InvoiceStatusManagerProps {
  quoteId: string;
  currentStatus: string;
  onStatusChange?: () => void;
}

export const InvoiceStatusManager = ({
  quoteId,
  currentStatus,
  onStatusChange,
}: InvoiceStatusManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: string, timestampField?: string) => {
    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      const { error } = await supabase.from("quotes").update(updateData).eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice status updated to ${newStatus}`,
      });

      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "sent":
        return "default";
      case "viewed":
        return "outline";
      case "paid":
        return "default";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusColor(currentStatus)}>{currentStatus}</Badge>

      {currentStatus === "draft" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("sent", "sent_at")}
          disabled={loading}
        >
          <Send className="h-4 w-4 mr-2" />
          Mark as Sent
        </Button>
      )}

      {currentStatus === "sent" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("viewed", "viewed_at")}
          disabled={loading}
        >
          <Eye className="h-4 w-4 mr-2" />
          Mark as Viewed
        </Button>
      )}

      {(currentStatus === "sent" || currentStatus === "viewed") && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("paid", "paid_at")}
          disabled={loading}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark as Paid
        </Button>
      )}
    </div>
  );
};
