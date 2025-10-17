import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plane, Ship, Package, Calculator as CalcIcon, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ItemRow from "./calculator/ItemRow";
import { ContainerCard } from "./calculator/ContainerCard";
import { DeliveryOptions } from "./calculator/DeliveryOptions";
import type { Origin, Destination, Agreement, RateType } from "@/types/locations";
import { CONTAINER_DIMENSIONS } from "@/types/locations";
import type { ShipmentItem } from "@/types/calculator";
import {
  calculateCBM,
  calculateChargeableWeight,
  calculateActualWeight,
  calculateVolumetricWeight,
  generateItemId,
} from "@/utils/calculatorUtils";

type ShippingMode = "air" | "sea_lcl" | "sea_fcl";

export const ShippingCalculatorNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<ShippingMode>("air");
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [selectedContainer, setSelectedContainer] = useState<RateType | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([
    {
      id: generateItemId(),
      length: 0,
      width: 0,
      height: 0,
      dimensionUnit: "m",
      weight: 0,
      weightUnit: "kg",
      quantity: 1,
    },
  ]);
  const [quote, setQuote] = useState<{
    agreement: Agreement;
    calculation: any;
    totalPrice: number;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "door_delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "",
    contactName: "",
    contactPhone: "",
  });

  useEffect(() => {
    checkAuth();
    loadLocations();
  }, []);

  // Pre-fill calculator from URL parameters (from Rates page)
  useEffect(() => {
    const modeParam = searchParams.get('mode') as ShippingMode | null;
    const originParam = searchParams.get('origin');
    const destParam = searchParams.get('dest');
    const containerParam = searchParams.get('container') as RateType | null;

    if (modeParam && ['air', 'sea_lcl', 'sea_fcl'].includes(modeParam)) {
      setMode(modeParam);
    }
    if (originParam) setSelectedOrigin(originParam);
    if (destParam) setSelectedDestination(destParam);
    if (containerParam && modeParam === 'sea_fcl') {
      setSelectedContainer(containerParam);
    }
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const loadLocations = async () => {
    const [originsRes, destinationsRes] = await Promise.all([
      supabase.from("origins").select("*").eq("active", true).order("name"),
      supabase.from("destinations").select("*").eq("active", true).order("name"),
    ]);

    if (originsRes.data) setOrigins(originsRes.data);
    if (destinationsRes.data) setDestinations(destinationsRes.data);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateItemId(),
        length: 0,
        width: 0,
        height: 0,
        dimensionUnit: "m",
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
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const findActiveAgreement = async (rateType: RateType): Promise<Agreement | null> => {
    // Use secure RPC that bypasses RLS while enforcing business rules internally
    const { data, error } = await supabase.rpc("get_public_active_agreement", {
      p_origin: selectedOrigin,
      p_destination: selectedDestination,
      p_rate_type: rateType,
    });

    if (error) {
      console.error("Error finding agreement:", error);
      return null;
    }

    // RPC returns an array, extract first element
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log("No active agreement found for:", { selectedOrigin, selectedDestination, rateType });
      return null;
    }

    const rawAgreement = Array.isArray(data) ? data[0] : data;

    // Coerce numeric fields to numbers and enrich with names
    const agreement: Agreement = {
      ...rawAgreement,
      buy_price: Number(rawAgreement.buy_price),
      sell_price: Number(rawAgreement.sell_price),
      margin_percent: Number(rawAgreement.margin_percent),
      min_charge: rawAgreement.min_charge ? Number(rawAgreement.min_charge) : null,
      origins: origins.find((o) => o.id === selectedOrigin),
      destinations: destinations.find((d) => d.id === selectedDestination),
    } as Agreement;

    return agreement;
  };

  const calculateQuote = async () => {
    if (!selectedOrigin || !selectedDestination) {
      toast.error("Please select origin and destination");
      return;
    }

    const validItems = items.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    );

    if (mode !== "sea_fcl" && validItems.length === 0) {
      toast.error("Please add at least one complete item");
      return;
    }

    if (mode === "sea_fcl" && !selectedContainer) {
      toast.error("Please select a container type");
      return;
    }

    let rateType: RateType;
    let calculation: any = {};
    let totalPrice = 0;

    if (mode === "air") {
      rateType = "AIR_KG";
      const chargeableWeight = calculateChargeableWeight(validItems);
      const actualWeight = calculateActualWeight(validItems);
      const volumetricWeight = calculateVolumetricWeight(validItems);
      
      calculation = {
        actualWeight: actualWeight.toFixed(1),
        volumetricWeight: volumetricWeight.toFixed(1),
        chargeableWeight: chargeableWeight.toFixed(1),
      };

      const agreement = await findActiveAgreement(rateType);
      if (!agreement) {
        toast.error(`No active rate found for Air Freight from ${origins.find(o => o.id === selectedOrigin)?.name} to ${destinations.find(d => d.id === selectedDestination)?.name}`);
        return;
      }

      if (!Number.isFinite(agreement.sell_price) || agreement.sell_price <= 0) {
        toast.error("Rate configuration error: Invalid or missing sell price");
        return;
      }

      totalPrice = chargeableWeight * agreement.sell_price;
      if (agreement.min_charge && totalPrice < agreement.min_charge) {
        totalPrice = agreement.min_charge;
      }

      setQuote({ agreement, calculation, totalPrice });
      toast.success("Quote calculated successfully!");
    } else if (mode === "sea_lcl") {
      rateType = "SEA_CBM";
      const totalCBM = calculateCBM(validItems);
      
      calculation = {
        totalCBM: totalCBM.toFixed(2),
      };

      const agreement = await findActiveAgreement(rateType);
      if (!agreement) {
        toast.error(`No active rate found for Sea LCL from ${origins.find(o => o.id === selectedOrigin)?.name} to ${destinations.find(d => d.id === selectedDestination)?.name}`);
        return;
      }

      if (!Number.isFinite(agreement.sell_price) || agreement.sell_price <= 0) {
        toast.error("Rate configuration error: Invalid or missing sell price");
        return;
      }

      totalPrice = totalCBM * agreement.sell_price;
      if (agreement.min_charge && totalPrice < agreement.min_charge) {
        totalPrice = agreement.min_charge;
      }

      setQuote({ agreement, calculation, totalPrice });
      toast.success("Quote calculated successfully!");
    } else if (mode === "sea_fcl") {
      rateType = selectedContainer!;
      
      const containerInfo = CONTAINER_DIMENSIONS[rateType];
      calculation = {
        containerType: rateType,
        capacity: containerInfo.capacity,
        dimensions: `${containerInfo.length}m × ${containerInfo.width}m × ${containerInfo.height}m`,
      };

      const agreement = await findActiveAgreement(rateType);
      if (!agreement) {
        toast.error(`No active rate found for ${rateType.replace("SEA_CONTAINER_", "")} container from ${origins.find(o => o.id === selectedOrigin)?.name} to ${destinations.find(d => d.id === selectedDestination)?.name}`);
        return;
      }

      if (!Number.isFinite(agreement.sell_price) || agreement.sell_price <= 0) {
        toast.error("Rate configuration error: Invalid or missing sell price");
        return;
      }

      totalPrice = agreement.sell_price;

      setQuote({ agreement, calculation, totalPrice });
      toast.success("Quote calculated successfully!");
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to submit a request");
      navigate("/auth");
      return;
    }

    if (!quote) {
      toast.error("Please calculate a quote first");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const requestData: any = {
      customer_id: session.user.id,
      shipping_type: mode === "air" ? "air" : "sea",
      calculated_cost: quote.totalPrice,
      status: "pending",
      delivery_type: deliveryType,
    };

    if (deliveryType === "door_delivery") {
      requestData.delivery_address = deliveryAddress.address;
      requestData.delivery_city = deliveryAddress.city;
      requestData.delivery_postal_code = deliveryAddress.postalCode;
      requestData.delivery_country = deliveryAddress.country;
      requestData.delivery_contact_name = deliveryAddress.contactName;
      requestData.delivery_contact_phone = deliveryAddress.contactPhone;
    }

    if (mode === "sea_fcl") {
      requestData.calculation_method = "container";
      requestData.container_type_id = selectedContainer;
    } else {
      requestData.calculation_method = mode === "sea_lcl" ? "cbm" : null;
      requestData.items = items;
    }

    const { error } = await supabase.from("shipment_requests").insert(requestData);

    if (error) {
      toast.error(`Failed to submit request: ${error.message}`);
      return;
    }

    toast.success("Shipment request submitted successfully!");
    navigate("/dashboard");
  };

  const isCalculateDisabled = () => {
    if (!selectedOrigin || !selectedDestination) return true;
    
    if (mode === "sea_fcl") {
      return !selectedContainer;
    }
    
    const validItems = items.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    );
    return validItems.length === 0;
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card>
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Package className="h-6 w-6" />
            Shipping Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as ShippingMode)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="air" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Air Freight
              </TabsTrigger>
              <TabsTrigger value="sea_lcl" className="flex items-center gap-2">
                <Ship className="h-4 w-4" />
                Sea LCL
              </TabsTrigger>
              <TabsTrigger value="sea_fcl" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Sea FCL
              </TabsTrigger>
            </TabsList>

            {/* Common: Origin & Destination */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label>
                  {mode === "air" ? "Origin (China)" : "Port of Origin (China)"}
                </Label>
                <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder={mode === "air" ? "Select origin city" : "Select origin port"} />
                  </SelectTrigger>
                  <SelectContent>
                    {origins.map((origin) => (
                      <SelectItem key={origin.id} value={origin.id}>
                        {origin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {mode === "air" ? "Destination" : "Port of Destination"}
                </Label>
                <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder={mode === "air" ? "Select destination" : "Select destination port"} />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Air & Sea LCL: Cargo Items */}
            <TabsContent value="air" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cargo Items</h3>
                  <Button onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No items added yet</p>
                    <Button onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Item
                    </Button>
                  </div>
                ) : (
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
                )}
              </div>
            </TabsContent>

            <TabsContent value="sea_lcl" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cargo Items</h3>
                  <Button onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">No items added yet</p>
                    <Button onClick={addItem} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Item
                    </Button>
                  </div>
                ) : (
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
                )}
              </div>
            </TabsContent>

            {/* Sea FCL: Container Selection */}
            <TabsContent value="sea_fcl" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Select Container Type</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <ContainerCard
                    name="20' Standard"
                    dimensions="5.9m × 2.35m × 2.39m"
                    capacity={33}
                    selected={selectedContainer === "SEA_CONTAINER_20"}
                    onClick={() => setSelectedContainer("SEA_CONTAINER_20")}
                  />
                  <ContainerCard
                    name="40' Standard"
                    dimensions="12.03m × 2.35m × 2.39m"
                    capacity={67}
                    selected={selectedContainer === "SEA_CONTAINER_40"}
                    onClick={() => setSelectedContainer("SEA_CONTAINER_40")}
                  />
                  <ContainerCard
                    name="40' High Cube"
                    dimensions="12.03m × 2.35m × 2.69m"
                    capacity={76}
                    selected={selectedContainer === "SEA_CONTAINER_40HC"}
                    onClick={() => setSelectedContainer("SEA_CONTAINER_40HC")}
                  />
                  <ContainerCard
                    name="45' High Cube"
                    dimensions="13.56m × 2.35m × 2.69m"
                    capacity={86}
                    selected={selectedContainer === "SEA_CONTAINER_45HC"}
                    onClick={() => setSelectedContainer("SEA_CONTAINER_45HC")}
                  />
                </div>

                {selectedContainer && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Selected Container Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium">
                            {selectedContainer.replace("SEA_CONTAINER_", "").replace("HC", " High Cube")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Capacity</p>
                          <p className="font-medium">{CONTAINER_DIMENSIONS[selectedContainer].capacity} CBM</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Internal Dimensions</p>
                          <p className="font-medium">
                            {CONTAINER_DIMENSIONS[selectedContainer].length}m ×{" "}
                            {CONTAINER_DIMENSIONS[selectedContainer].width}m ×{" "}
                            {CONTAINER_DIMENSIONS[selectedContainer].height}m
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Delivery Options */}
          <div className="mt-6">
            <DeliveryOptions
              deliveryType={deliveryType}
              onDeliveryTypeChange={setDeliveryType}
              deliveryAddress={deliveryAddress.address}
              deliveryCity={deliveryAddress.city}
              deliveryPostalCode={deliveryAddress.postalCode}
              deliveryCountry={deliveryAddress.country}
              deliveryContactName={deliveryAddress.contactName}
              deliveryContactPhone={deliveryAddress.contactPhone}
              onAddressChange={(field, value) => {
                setDeliveryAddress(prev => {
                  const key = field.replace("delivery", "").charAt(0).toLowerCase() + field.replace("delivery", "").slice(1);
                  return { ...prev, [key]: value };
                });
              }}
            />
          </div>

          {/* Calculate Button */}
          <Button
            onClick={calculateQuote}
            className="w-full mt-6"
            size="lg"
            disabled={isCalculateDisabled()}
          >
            <CalcIcon className="h-5 w-5 mr-2" />
            Calculate Shipping Cost
          </Button>

          {/* Quote Breakdown */}
          {quote && (
            <Card className="mt-6 border-primary">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lane</p>
                  <p className="font-medium">
                    {origins.find(o => o.id === selectedOrigin)?.name} → {destinations.find(d => d.id === selectedDestination)?.name}
                  </p>
                </div>

                {quote.calculation.chargeableWeight && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Actual Weight</p>
                      <p className="font-medium">{quote.calculation.actualWeight} kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Volumetric Weight</p>
                      <p className="font-medium">{quote.calculation.volumetricWeight} kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Chargeable Weight</p>
                      <p className="font-medium">{quote.calculation.chargeableWeight} kg</p>
                    </div>
                  </div>
                )}

                {quote.calculation.totalCBM && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total CBM</p>
                    <p className="font-medium">{quote.calculation.totalCBM} CBM</p>
                  </div>
                )}

                {quote.calculation.containerType && (
                  <div>
                    <p className="text-sm text-muted-foreground">Container</p>
                    <p className="font-medium">
                      {quote.calculation.containerType.replace("SEA_CONTAINER_", "").replace("HC", " High Cube")}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Cost</span>
                    <span className="text-2xl font-bold text-primary">
                      ${quote.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {quote.agreement.sell_price && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Rate: ${quote.agreement.sell_price.toFixed(2)} per{" "}
                      {mode === "air" ? "kg" : mode === "sea_lcl" ? "CBM" : "container"}
                    </p>
                  )}
                </div>

                <Button onClick={handleSubmit} className="w-full" size="lg">
                  Submit Shipment Request
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
