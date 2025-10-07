import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, Clock, FileText } from "lucide-react";

interface QuoteBreakdown {
  shipping: number;
  customs: number;
  insurance: number;
  handling: number;
  notes?: string;
}

interface Quote {
  id: string;
  shipment_request_id: string;
  total_sell_price: number;
  breakdown: QuoteBreakdown;
  valid_until: string;
  created_at: string;
}

interface QuoteViewProps {
  requestId: string;
}

const QuoteView = ({ requestId }: QuoteViewProps) => {
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [requestId]);

  const fetchQuote = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("shipment_request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setQuote({
          ...data,
          breakdown: data.breakdown as unknown as QuoteBreakdown
        });
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!quote) return;
    setAccepting(true);

    try {
      const { error } = await supabase
        .from("shipment_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Quote accepted",
        description: "Your shipment request has been approved. We'll proceed with the shipment.",
      });
    } catch (error) {
      console.error("Error accepting quote:", error);
      toast({
        title: "Error",
        description: "Failed to accept quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No quote available yet</p>
            <p className="text-sm mt-1">We'll notify you when your quote is ready</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isExpired = new Date(quote.valid_until) < new Date();
  const breakdown = quote.breakdown;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Quote</CardTitle>
          {isExpired ? (
            <Badge variant="destructive">Expired</Badge>
          ) : (
            <Badge variant="outline">Valid</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping Cost:</span>
            <span>₦{breakdown.shipping?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Customs Fees:</span>
            <span>₦{breakdown.customs?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Insurance:</span>
            <span>₦{breakdown.insurance?.toFixed(2) || "0.00"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Handling Fees:</span>
            <span>₦{breakdown.handling?.toFixed(2) || "0.00"}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total Price:</span>
            <span>₦{quote.total_sell_price.toFixed(2)}</span>
          </div>
        </div>

        {breakdown.notes && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-1">Additional Notes:</p>
            <p className="text-sm text-muted-foreground">{breakdown.notes}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Quote created: {format(new Date(quote.created_at), "PPP")}</p>
          <p>Valid until: {format(new Date(quote.valid_until), "PPP")}</p>
        </div>

        {!isExpired && (
          <Button
            onClick={handleAcceptQuote}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? (
              "Processing..."
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Quote
              </>
            )}
          </Button>
        )}

        {isExpired && (
          <p className="text-sm text-center text-muted-foreground">
            This quote has expired. Please contact support for a new quote.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteView;
