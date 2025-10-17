import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, Shield } from "lucide-react";

interface PaymentButtonProps {
  requestId: string;
  amount: number;
  currency?: string;
  requestStatus: string;
}

const PaymentButton = ({ requestId, amount, currency = "USD", requestStatus }: PaymentButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          requestId,
          amount,
          currency,
        },
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error("Failed to create payment session");
      }

      // Open Stripe Checkout in new tab
      window.open(data.url, "_blank");

      toast({
        title: "Payment session created",
        description: "Opening Stripe Checkout in a new tab...",
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Payment failed",
        description: "Failed to create payment session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show for approved or quoted requests that aren't paid yet
  if (requestStatus !== "approved" && requestStatus !== "quoted") {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Required
        </CardTitle>
        <CardDescription>Secure payment powered by Stripe</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-2xl font-bold">{currency} {amount.toFixed(2)}</p>
          </div>
          <Shield className="h-8 w-8 text-primary" />
        </div>

        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now with Stripe
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Secure payment processing. Your payment information is never stored on our servers.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentButton;
