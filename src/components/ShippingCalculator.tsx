import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ship, Plane, Package, Calculator, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ItemRow from "./calculator/ItemRow";
import QuoteBreakdown from "./calculator/QuoteBreakdown";
import { ShipmentItem, QuoteBreakdown as QuoteBreakdownType } from "@/types/calculator";
import {
  calculateCBM,
  calculateChargeableWeight,
  calculateActualWeight,
  calculateVolumetricWeight,
  generateItemId,
} from "@/utils/calculatorUtils";

interface ContainerType {
  id: string;
  name: string;
  cbm_capacity: number;
}

interface Rate {
  id: string;
  rate_type: string;
  base_rate: number;
  buy_price: number | null;
  sell_price: number | null;
  margin_percentage: number;
  container_type_id: string | null;
}

const ShippingCalculator = () => {
  const navigate = useNavigate();
  const [shippingType, setShippingType] = useState<"sea" | "air">("sea");
  const [seaMethod, setSeaMethod] = useState<"cbm" | "container">("cbm");
  const [containers, setContainers] = useState<ContainerType[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [rates, setRates] = useState<Rate[]>([]);
  
  // Multi-item state
  const [items, setItems] = useState<ShipmentItem[]>([
    {
      id: generateItemId(),
      length: 0,
      width: 0,
      height: 0,
      dimensionUnit: "cm",
      weight: 0,
      weightUnit: "kg",
      quantity: 1,
    },
  ]);
  
  const [quoteBreakdown, setQuoteBreakdown] = useState<QuoteBreakdownType | null>(null);
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    loadContainers();
    loadRates();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const loadContainers = async () => {
    const { data, error } = await supabase
      .from("container_types")
      .select("*")
      .order("size_feet");
    
    if (error) {
      console.error("Error loading containers:", error);
      return;
    }
    
    setContainers(data || []);
  };

  const loadRates = async () => {
    const { data, error } = await supabase
      .from("shipping_rates")
      .select("*")
      .eq("is_active", true);
    
    if (error) {
      console.error("Error loading rates:", error);
      return;
    }
    
    setRates(data || []);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateItemId(),
        length: 0,
        width: 0,
        height: 0,
        dimensionUnit: "cm",
        weight: 0,
        weightUnit: "kg",
        quantity: 1,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ShipmentItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateQuote = () => {
    // Validate items
    const validItems = items.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one complete item");
      return;
    }

    let baseRate = 0;
    let buyCost = 0;
    let sellPrice = 0;
    let calculations: any = {};

    if (shippingType === "sea") {
      if (seaMethod === "cbm") {
        const totalCBM = calculateCBM(validItems);
        const cbmRate = rates.find((r) => r.rate_type === "sea_cbm");
        
        if (!cbmRate) {
          toast.error("CBM rate not found");
          return;
        }

        calculations.totalCBM = totalCBM;
        
        // Use buy/sell prices if available, otherwise fall back to base_rate
        buyCost = totalCBM * (cbmRate.buy_price || cbmRate.base_rate);
        sellPrice = totalCBM * (cbmRate.sell_price || cbmRate.base_rate);
        baseRate = buyCost;
        
        // Calculate profit
        const profitAmount = sellPrice - buyCost;
        const profitMarginPercentage = buyCost > 0 ? (profitAmount / buyCost) * 100 : 0;
        
        const breakdown: QuoteBreakdownType = {
          baseRate: buyCost,
          surcharges: [],
          margin: {
            type: "percentage",
            value: profitMarginPercentage,
            amount: profitAmount,
          },
          subtotal: sellPrice,
          total: sellPrice,
          calculations,
        };
        
        setQuoteBreakdown(breakdown);
      } else {
        // Container method
        if (!selectedContainer) {
          toast.error("Please select a container type");
          return;
        }

        const containerRate = rates.find(
          (r) => r.rate_type === "sea_container" && r.container_type_id === selectedContainer
        );

        if (!containerRate) {
          toast.error("Container rate not found");
          return;
        }

        buyCost = containerRate.buy_price || containerRate.base_rate;
        sellPrice = containerRate.sell_price || containerRate.base_rate;
        baseRate = buyCost;
        
        const profitAmount = sellPrice - buyCost;
        const profitMarginPercentage = buyCost > 0 ? (profitAmount / buyCost) * 100 : 0;
        
        const breakdown: QuoteBreakdownType = {
          baseRate: buyCost,
          surcharges: [],
          margin: {
            type: "percentage",
            value: profitMarginPercentage,
            amount: profitAmount,
          },
          subtotal: sellPrice,
          total: sellPrice,
          calculations,
        };
        
        setQuoteBreakdown(breakdown);
      }
    } else {
      // Air shipping
      const chargeableWeight = calculateChargeableWeight(validItems);
      const actualWeight = calculateActualWeight(validItems);
      const volumetricWeight = calculateVolumetricWeight(validItems);
      const airRate = rates.find((r) => r.rate_type === "air_kg");

      if (!airRate) {
        toast.error("Air rate not found");
        return;
      }

      calculations = {
        totalWeight: actualWeight,
        volumetricWeight: volumetricWeight,
        chargeableWeight: chargeableWeight,
      };

      buyCost = chargeableWeight * (airRate.buy_price || airRate.base_rate);
      sellPrice = chargeableWeight * (airRate.sell_price || airRate.base_rate);
      baseRate = buyCost;
      
      const profitAmount = sellPrice - buyCost;
      const profitMarginPercentage = buyCost > 0 ? (profitAmount / buyCost) * 100 : 0;
      
      const breakdown: QuoteBreakdownType = {
        baseRate: buyCost,
        surcharges: [],
        margin: {
          type: "percentage",
          value: profitMarginPercentage,
          amount: profitAmount,
        },
        subtotal: sellPrice,
        total: sellPrice,
        calculations,
      };
      
      setQuoteBreakdown(breakdown);
    }

    // Set validity (7 days from now)
    const validity = new Date();
    validity.setDate(validity.getDate() + 7);
    setValidUntil(validity);

    toast.success("Quote calculated successfully!");
  };

  const handleSubmitRequest = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to submit a shipment request");
      navigate("/auth");
      return;
    }

    if (!quoteBreakdown) {
      toast.error("Please calculate the cost first");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const requestData: any = {
      customer_id: user.id,
      shipping_type: shippingType,
      calculated_cost: quoteBreakdown.total,
      items: JSON.stringify(items),
    };

    if (shippingType === "sea") {
      requestData.calculation_method = seaMethod;
      if (seaMethod === "container") {
        requestData.container_type_id = selectedContainer;
      }
    } else {
      requestData.calculation_method = "weight";
    }

    const { data: shipmentRequest, error: requestError } = await supabase
      .from("shipment_requests")
      .insert([requestData])
      .select()
      .single();

    if (requestError || !shipmentRequest) {
      toast.error("Failed to submit request");
      console.error(requestError);
      return;
    }

    // Create quote record with profit tracking
    const { error: quoteError } = await supabase.from("quotes").insert([
      {
        shipment_request_id: shipmentRequest.id,
        breakdown: JSON.parse(JSON.stringify(quoteBreakdown)),
        total_sell_price: quoteBreakdown.total,
        buy_cost: quoteBreakdown.baseRate,
        profit_amount: quoteBreakdown.margin.amount,
        profit_margin_percentage: quoteBreakdown.margin.value,
        valid_until: validUntil?.toISOString(),
      },
    ]);

    if (quoteError) {
      console.error("Failed to save quote:", quoteError);
    }

    toast.success("Shipment request submitted successfully!");
    navigate("/dashboard");
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Shipping Cost Calculator
        </CardTitle>
        <CardDescription>
          Calculate your shipping costs for sea or air freight with multiple items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={shippingType} onValueChange={(v) => setShippingType(v as "sea" | "air")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sea" className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Sea Shipping
            </TabsTrigger>
            <TabsTrigger value="air" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Air Shipping
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sea" className="space-y-6 mt-6">
            <RadioGroup value={seaMethod} onValueChange={(v) => setSeaMethod(v as "cbm" | "container")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cbm" id="cbm" />
                <Label htmlFor="cbm">Calculate by CBM (Cubic Meter)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="container" id="container" />
                <Label htmlFor="container">Calculate by Container</Label>
              </div>
            </RadioGroup>

            {seaMethod === "container" && (
              <div className="space-y-2">
                <Label htmlFor="container-select">Select Container Type</Label>
                <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                  <SelectTrigger id="container-select">
                    <SelectValue placeholder="Choose a container" />
                  </SelectTrigger>
                  <SelectContent>
                    {containers.map((container) => (
                      <SelectItem key={container.id} value={container.id}>
                        {container.name} ({container.cbm_capacity} CBM)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="air" className="mt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Air freight is calculated using chargeable weight (higher of actual or volumetric weight)
            </p>
          </TabsContent>
        </Tabs>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Shipment Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
                canRemove={items.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <Button onClick={calculateQuote} className="w-full" size="lg">
          <Calculator className="mr-2 h-4 w-4" />
          Calculate Quote
        </Button>

        {/* Quote Breakdown */}
        {quoteBreakdown && (
          <div className="space-y-4">
            <QuoteBreakdown
              breakdown={quoteBreakdown}
              validUntil={validUntil}
              shippingType={shippingType}
            />

            <Button onClick={handleSubmitRequest} className="w-full" size="lg">
              <Package className="mr-2 h-4 w-4" />
              Submit Shipment Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShippingCalculator;
