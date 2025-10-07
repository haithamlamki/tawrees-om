import { QuoteBreakdown as QuoteBreakdownType } from "@/types/calculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface QuoteBreakdownProps {
  breakdown: QuoteBreakdownType;
  validUntil: Date | null;
  shippingType: "sea" | "air";
}

const QuoteBreakdown = ({ breakdown, validUntil, shippingType }: QuoteBreakdownProps) => {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Card className="shadow-card border-accent/20">
      <CardHeader className="bg-accent/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Quote Breakdown</CardTitle>
            <CardDescription>
              {shippingType === "air" ? "Air Freight" : "Sea Freight"} Calculation
            </CardDescription>
          </div>
          {validUntil && (
            <Badge variant="outline" className="text-xs">
              Valid until {new Date(validUntil).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Calculation Details */}
        {breakdown.calculations && (
          <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Info className="h-4 w-4" />
              <span className="font-medium">Calculation Details</span>
            </div>
            {shippingType === "air" && (
              <>
                <div className="flex justify-between">
                  <span>Actual Weight:</span>
                  <span className="font-medium">
                    {breakdown.calculations.totalWeight?.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Volumetric Weight:</span>
                  <span className="font-medium">
                    {breakdown.calculations.volumetricWeight?.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex justify-between text-primary">
                  <span className="font-semibold">Chargeable Weight:</span>
                  <span className="font-bold">
                    {breakdown.calculations.chargeableWeight?.toFixed(2)} kg
                  </span>
                </div>
              </>
            )}
            {shippingType === "sea" && breakdown.calculations.totalCBM && (
              <div className="flex justify-between text-primary">
                <span className="font-semibold">Total Volume:</span>
                <span className="font-bold">
                  {breakdown.calculations.totalCBM.toFixed(3)} CBM
                </span>
              </div>
            )}
          </div>
        )}

        {/* Base Rate */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Base Rate</span>
          <span className="font-semibold">{formatCurrency(breakdown.baseRate)}</span>
        </div>

        {/* Surcharges */}
        {breakdown.surcharges.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Surcharges</span>
              {breakdown.surcharges.map((surcharge, index) => (
                <div key={index} className="flex justify-between items-center pl-4">
                  <span className="text-sm text-muted-foreground capitalize">
                    {surcharge.type.replace("_", " ")}
                  </span>
                  <span className="text-sm">{formatCurrency(surcharge.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Margin */}
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Margin ({breakdown.margin.type === "percentage" ? `${breakdown.margin.value}%` : "Flat"})
          </span>
          <span className="font-semibold">{formatCurrency(breakdown.margin.amount)}</span>
        </div>

        {/* Subtotal */}
        <Separator />
        <div className="flex justify-between items-center">
          <span className="font-medium">Subtotal</span>
          <span className="font-bold">{formatCurrency(breakdown.subtotal)}</span>
        </div>

        {/* Total */}
        <Separator className="bg-accent/30" />
        <div className="flex justify-between items-center bg-accent/10 -mx-6 px-6 py-4 rounded-lg">
          <span className="text-lg font-bold">Total Cost</span>
          <span className="text-2xl font-bold text-accent">
            {formatCurrency(breakdown.total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteBreakdown;
