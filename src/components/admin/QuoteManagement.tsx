import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sendQuoteReadyNotification } from "@/utils/notificationUtils";

interface QuoteManagementProps {
  requestId: string;
  calculatedCost: number;
  onQuoteCreated?: () => void;
}

const QuoteManagement = ({ requestId, calculatedCost, onQuoteCreated }: QuoteManagementProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    buyCost: "",
    sellPrice: calculatedCost.toString(),
    validDays: "30",
    shippingCost: "",
    customsFees: "",
    insuranceCost: "",
    handlingFees: "",
    notes: "",
  });

  // Fetch buy cost from rates based on shipment request
  useEffect(() => {
    const fetchBuyCost = async () => {
      try {
        // Get shipment request details
        const { data: request } = await supabase
          .from("shipment_requests")
          .select("shipping_type, calculation_method, cbm_volume, weight_kg")
          .eq("id", requestId)
          .single();

        if (!request) return;

        // Determine rate type
        let rateType = "";
        if (request.shipping_type === "air") {
          rateType = "air_kg";
        } else if (request.calculation_method === "cbm") {
          rateType = "sea_cbm";
        } else if (request.calculation_method === "container") {
          rateType = "sea_container";
        }

        // Fetch rate
        const { data: rate } = await supabase
          .from("shipping_rates")
          .select("buy_price, base_rate, sell_price")
          .eq("rate_type", rateType)
          .eq("is_active", true)
          .single();

        if (rate) {
          // Calculate buy cost based on volume/weight
          let buyCost = 0;
          const rateValue = rate.buy_price || rate.base_rate || rate.sell_price || 0;
          
          if (request.shipping_type === "air") {
            buyCost = (request.weight_kg || 0) * rateValue;
          } else if (request.calculation_method === "cbm") {
            buyCost = (request.cbm_volume || 0) * rateValue;
          } else {
            buyCost = rateValue; // Container rate is flat
          }

          setFormData(prev => ({ ...prev, buyCost: buyCost.toFixed(2) }));
        }
      } catch (error) {
        console.error("Error fetching buy cost:", error);
      }
    };

    fetchBuyCost();
  }, [requestId]);

  const calculateProfit = () => {
    const buy = parseFloat(formData.buyCost) || 0;
    const sell = parseFloat(formData.sellPrice) || 0;
    const profit = sell - buy;
    const margin = buy > 0 ? (profit / buy) * 100 : 0;
    return { profit, margin };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { profit, margin } = calculateProfit();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(formData.validDays));

      const breakdown = {
        shipping: parseFloat(formData.shippingCost) || 0,
        customs: parseFloat(formData.customsFees) || 0,
        insurance: parseFloat(formData.insuranceCost) || 0,
        handling: parseFloat(formData.handlingFees) || 0,
        notes: formData.notes,
      };

      const { error: quoteError } = await supabase
        .from("quotes")
        .insert({
          shipment_request_id: requestId,
          buy_cost: parseFloat(formData.buyCost),
          total_sell_price: parseFloat(formData.sellPrice),
          profit_amount: profit,
          profit_margin_percentage: margin,
          breakdown,
          valid_until: validUntil.toISOString(),
        });

      if (quoteError) throw quoteError;

      // Update request status
      const { error: updateError } = await supabase
        .from("shipment_requests")
        .update({ status: "quoted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Get customer ID for notification
      const { data: requestData } = await supabase
        .from("shipment_requests")
        .select("customer_id")
        .eq("id", requestId)
        .single();

      if (requestData?.customer_id) {
        // Send notification
        await sendQuoteReadyNotification(
          requestData.customer_id,
          requestId,
          parseFloat(formData.sellPrice),
          validUntil.toISOString()
        );
      }

      toast({
        title: "Quote created",
        description: "The quote has been sent to the customer.",
      });

      onQuoteCreated?.();
    } catch (error) {
      console.error("Error creating quote:", error);
      toast({
        title: "Error",
        description: "Failed to create quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { profit, margin } = calculateProfit();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Quote</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyCost">Buy Cost ($)</Label>
              <Input
                id="buyCost"
                type="number"
                step="0.01"
                value={formData.buyCost}
                onChange={(e) => setFormData({ ...formData, buyCost: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellPrice">Sell Price ($)</Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shippingCost">Shipping Cost ($)</Label>
              <Input
                id="shippingCost"
                type="number"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customsFees">Customs Fees ($)</Label>
              <Input
                id="customsFees"
                type="number"
                step="0.01"
                value={formData.customsFees}
                onChange={(e) => setFormData({ ...formData, customsFees: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insuranceCost">Insurance ($)</Label>
              <Input
                id="insuranceCost"
                type="number"
                step="0.01"
                value={formData.insuranceCost}
                onChange={(e) => setFormData({ ...formData, insuranceCost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handlingFees">Handling Fees ($)</Label>
              <Input
                id="handlingFees"
                type="number"
                step="0.01"
                value={formData.handlingFees}
                onChange={(e) => setFormData({ ...formData, handlingFees: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="validDays">Valid For (Days)</Label>
            <Input
              id="validDays"
              type="number"
              value={formData.validDays}
              onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Profit:</span>
              <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                ${profit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Profit Margin:</span>
              <span className={margin >= 0 ? "text-green-600" : "text-red-600"}>
                {margin.toFixed(2)}%
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Quote..." : "Create & Send Quote"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuoteManagement;
