import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ship, Plane, Package, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ContainerType {
  id: string;
  name: string;
  cbm_capacity: number;
}

interface Rate {
  id: string;
  rate_type: string;
  base_rate: number;
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
  
  // Form fields
  const [cbm, setCbm] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);
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

  const calculateCost = () => {
    let cost = 0;
    
    if (shippingType === "sea") {
      if (seaMethod === "cbm") {
        const cbmValue = parseFloat(cbm);
        const cbmRate = rates.find(r => r.rate_type === "sea_cbm");
        if (cbmRate && cbmValue) {
          const baseWithMargin = cbmRate.base_rate * (1 + cbmRate.margin_percentage / 100);
          cost = cbmValue * baseWithMargin;
        }
      } else {
        const containerRate = rates.find(
          r => r.rate_type === "sea_container" && r.container_type_id === selectedContainer
        );
        if (containerRate) {
          cost = containerRate.base_rate * (1 + containerRate.margin_percentage / 100);
        }
      }
    } else {
      // Air shipping - use weight
      const weightValue = parseFloat(weight);
      const airRate = rates.find(r => r.rate_type === "air_kg");
      if (airRate && weightValue) {
        const baseWithMargin = airRate.base_rate * (1 + airRate.margin_percentage / 100);
        cost = weightValue * baseWithMargin;
      }
    }
    
    setCalculatedCost(cost);
  };

  const handleSubmitRequest = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to submit a shipment request");
      navigate("/auth");
      return;
    }

    if (!calculatedCost) {
      toast.error("Please calculate the cost first");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const requestData: any = {
      customer_id: user.id,
      shipping_type: shippingType,
      calculated_cost: calculatedCost,
    };

    if (shippingType === "sea") {
      requestData.calculation_method = seaMethod;
      if (seaMethod === "cbm") {
        requestData.cbm_volume = parseFloat(cbm);
      } else {
        requestData.container_type_id = selectedContainer;
      }
    } else {
      requestData.calculation_method = "weight";
      requestData.weight_kg = parseFloat(weight);
      requestData.length_cm = parseFloat(length);
      requestData.width_cm = parseFloat(width);
      requestData.height_cm = parseFloat(height);
    }

    const { error } = await supabase
      .from("shipment_requests")
      .insert([requestData]);

    if (error) {
      toast.error("Failed to submit request");
      console.error(error);
      return;
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
          Calculate your shipping costs for sea or air freight
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={shippingType} onValueChange={(v) => setShippingType(v as "sea" | "air")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sea" className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Sea Shipping
            </TabsTrigger>
            <TabsTrigger value="air" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Air Shipping
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sea" className="space-y-6">
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

            {seaMethod === "cbm" ? (
              <div className="space-y-2">
                <Label htmlFor="cbm-input">Volume (CBM)</Label>
                <Input
                  id="cbm-input"
                  type="number"
                  step="0.01"
                  placeholder="Enter volume in cubic meters"
                  value={cbm}
                  onChange={(e) => setCbm(e.target.value)}
                />
              </div>
            ) : (
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

          <TabsContent value="air" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="Enter weight in kilograms"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">Length (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.1"
                  placeholder="Length"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  placeholder="Width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  placeholder="Height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-4">
          <Button onClick={calculateCost} className="w-full" size="lg">
            Calculate Cost
          </Button>

          {calculatedCost !== null && (
            <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              <p className="text-4xl font-bold text-accent">
                ${calculatedCost.toFixed(2)}
              </p>
              <Button onClick={handleSubmitRequest} variant="default" size="lg" className="mt-4">
                <Package className="mr-2 h-4 w-4" />
                Submit Request
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingCalculator;
