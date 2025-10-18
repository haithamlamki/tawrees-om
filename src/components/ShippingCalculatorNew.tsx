import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plane, Ship, Package, Calculator as CalcIcon, Plus } from "lucide-react";
import boxDimensionsImage from "@/assets/box-dimensions.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PackageRow } from "./calculator/PackageRow";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ShippingMode = "air" | "sea_lcl" | "sea_fcl";

export const ShippingCalculatorNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [mode, setMode] = useState<ShippingMode>("sea_lcl");
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
      dimensionUnit: "cm",
      weight: 0,
      weightUnit: "kg",
      quantity: 1,
      productName: "",
      productImage: "",
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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedCalculation, setSavedCalculation] = useState<any>(null);

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
    
    // Check for saved calculation after authentication
    if (session) {
      const saved = localStorage.getItem('pendingCalculation');
      if (saved) {
        const calculationData = JSON.parse(saved);
        setSavedCalculation(calculationData);
        setShowRestoreDialog(true);
      }
    }
  };

  const loadLocations = async () => {
    const [originsRes, destinationsRes] = await Promise.all([
      supabase.from("origins").select("*").eq("active", true).order("name"),
      supabase.from("destinations").select("*").eq("active", true).order("name"),
    ]);

    if (originsRes.data) {
      setOrigins(originsRes.data);
      
      // Set default origin to Guangzhou if no URL param
      if (!searchParams.get('origin')) {
        const guangzhou = originsRes.data.find(o => o.name.toLowerCase().includes('guangzhou'));
        if (guangzhou) setSelectedOrigin(guangzhou.id);
      }
    }
    
    if (destinationsRes.data) {
      setDestinations(destinationsRes.data);
      
      // Set default destination to Muscat if no URL param
      if (!searchParams.get('dest')) {
        const muscat = destinationsRes.data.find(d => d.name.toLowerCase().includes('muscat'));
        if (muscat) setSelectedDestination(muscat.id);
      }
    }
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
        productName: "",
        productImage: "",
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

  const saveCalculationAndRedirect = () => {
    const calculationData = {
      timestamp: Date.now(),
      mode,
      items,
      selectedOrigin,
      selectedDestination,
      selectedContainer,
      deliveryType,
      deliveryAddress,
      quote,
    };
    
    localStorage.setItem('pendingCalculation', JSON.stringify(calculationData));
    navigate("/auth?returnTo=/");
  };

  const restoreSavedCalculation = async () => {
    if (!savedCalculation) return;
    
    console.log("Restoring saved calculation:", savedCalculation);
    
    // Clear the dialog first
    setShowRestoreDialog(false);
    
    toast.success("Restoring your calculation...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to submit");
        return;
      }

      if (!savedCalculation.quote) {
        toast.error("No quote data found");
        localStorage.removeItem('pendingCalculation');
        return;
      }

      console.log("Submitting with quote:", savedCalculation.quote);

      const requestData: any = {
        customer_id: session.user.id,
        shipping_type: savedCalculation.mode === "air" ? "air" : "sea",
        calculated_cost: savedCalculation.quote.totalPrice,
        status: "pending",
        delivery_type: savedCalculation.deliveryType || "pickup",
      };

      // Calculate and add totals based on saved items
      if (savedCalculation.mode === "air" || savedCalculation.mode === "sea_lcl") {
        const savedItems = savedCalculation.items || [];
        const validItems = savedItems.filter(
          (item: any) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
        );
        
        if (validItems.length > 0) {
          requestData.weight_kg = calculateActualWeight(validItems);
          requestData.cbm_volume = calculateCBM(validItems);
          requestData.items = savedItems;
        }
      }

      // Add delivery address if applicable
      if (savedCalculation.deliveryType === "door_delivery" && savedCalculation.deliveryAddress) {
        requestData.delivery_address = savedCalculation.deliveryAddress.address;
        requestData.delivery_city = savedCalculation.deliveryAddress.city;
        requestData.delivery_postal_code = savedCalculation.deliveryAddress.postalCode;
        requestData.delivery_country = savedCalculation.deliveryAddress.country;
        requestData.delivery_contact_name = savedCalculation.deliveryAddress.contactName;
        requestData.delivery_contact_phone = savedCalculation.deliveryAddress.contactPhone;
      }

      // Set calculation method
      if (savedCalculation.mode === "sea_fcl") {
        requestData.calculation_method = "container";
        requestData.container_type_id = savedCalculation.selectedContainer;
      } else {
        requestData.calculation_method = savedCalculation.mode === "sea_lcl" ? "cbm" : null;
      }

      console.log("Submitting request data:", requestData);

      const { data, error } = await supabase.from("shipment_requests").insert(requestData).select();

      if (error) {
        console.error("Submission error:", error);
        toast.error(`Failed to submit: ${error.message}`);
        return;
      }

      console.log("Submission successful:", data);

      // Clear saved data
      localStorage.removeItem('pendingCalculation');
      setSavedCalculation(null);

      toast.success("Shipment request submitted successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error in restoreSavedCalculation:", error);
      toast.error("Failed to submit request. Please try again.");
    }
  };

  const dismissSavedCalculation = () => {
    setShowRestoreDialog(false);
    setSavedCalculation(null);
    localStorage.removeItem('pendingCalculation');
  };

  const submitCalculation = async () => {
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

    // Calculate and add totals based on items
    if (mode === "air" || mode === "sea_lcl") {
      const validItems = items.filter(
        (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
      );
      
      requestData.weight_kg = calculateActualWeight(validItems);
      requestData.cbm_volume = calculateCBM(validItems);
    }

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

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to submit a request");
      saveCalculationAndRedirect();
      return;
    }
    
    await submitCalculation();
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
    <>
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Previous Calculation?</AlertDialogTitle>
            <AlertDialogDescription>
              We found your previous shipping calculation. Would you like to restore it and submit the request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissSavedCalculation}>
              Discard
            </AlertDialogCancel>
            <AlertDialogAction onClick={restoreSavedCalculation}>
              Restore & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <div className="space-y-6">
                  {/* Dimension Guide Image */}
                  <div className="flex justify-center mb-4">
                    <img 
                      src={boxDimensionsImage} 
                      alt="Box dimensions guide showing length, width (breadth), and height" 
                      className="max-w-xs h-auto"
                    />
                  </div>
                  
                  {items.map((item, index) => (
                    <PackageRow
                      key={item.id}
                      item={item}
                      index={index}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      canRemove={items.length > 1}
                    />
                  ))}
                  
                  <Button onClick={addItem} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("calculator:addMoreRows")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="sea_lcl" className="mt-0">
                <div className="space-y-6">
                  {/* Dimension Guide Image */}
                  <div className="flex justify-center mb-4">
                    <img 
                      src={boxDimensionsImage} 
                      alt="Box dimensions guide showing length, width (breadth), and height" 
                      className="max-w-xs h-auto"
                    />
                  </div>
                  
                  {items.map((item, index) => (
                    <PackageRow
                      key={item.id}
                      item={item}
                      index={index}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      canRemove={items.length > 1}
                    />
                  ))}
                  
                  <Button onClick={addItem} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("calculator:addMoreRows")}
                  </Button>
                </div>
              </TabsContent>

              {/* Sea FCL: Container Selection */}
              <TabsContent value="sea_fcl" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Container Type</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ContainerCard
                      name="20' Standard Container"
                      dimensions="5.9m × 2.35m × 2.39m"
                      capacity={33}
                      selected={selectedContainer === "SEA_CONTAINER_20"}
                      onClick={() => setSelectedContainer("SEA_CONTAINER_20")}
                    />
                    <ContainerCard
                      name="40' Standard Container"
                      dimensions="12.03m × 2.35m × 2.39m"
                      capacity={67}
                      selected={selectedContainer === "SEA_CONTAINER_40"}
                      onClick={() => setSelectedContainer("SEA_CONTAINER_40")}
                    />
                    <ContainerCard
                      name="40' High Cube Container"
                      dimensions="12.03m × 2.35m × 2.69m"
                      capacity={76}
                      selected={selectedContainer === "SEA_CONTAINER_40HC"}
                      onClick={() => setSelectedContainer("SEA_CONTAINER_40HC")}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Delivery Options */}
            <div className="mt-6">
              <DeliveryOptions
                deliveryType={deliveryType}
                deliveryAddress={deliveryAddress.address}
                deliveryCity={deliveryAddress.city}
                deliveryPostalCode={deliveryAddress.postalCode}
                deliveryCountry={deliveryAddress.country}
                deliveryContactName={deliveryAddress.contactName}
                deliveryContactPhone={deliveryAddress.contactPhone}
                onDeliveryTypeChange={setDeliveryType}
                onAddressChange={(field, value) => {
                  // field will be like "deliveryAddress", "deliveryCity", etc.
                  // Convert to state keys: "address", "city", etc.
                  const stateKey = field.startsWith('delivery') 
                    ? field.charAt(8).toLowerCase() + field.slice(9) 
                    : field;
                  setDeliveryAddress((prev) => ({
                    ...prev,
                    [stateKey]: value
                  }));
                }}
              />
            </div>

            {/* Calculate Button */}
            <div className="mt-6">
              <Button
                onClick={calculateQuote}
                disabled={isCalculateDisabled()}
                className="w-full"
                size="lg"
              >
                <CalcIcon className="mr-2 h-5 w-5" />
                Calculate Shipping Cost
              </Button>
            </div>

            {/* Quote Display */}
            {quote && (
              <div className="mt-6 p-6 bg-secondary/20 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold">Quote Breakdown</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Route:</span>
                    <span className="font-medium">
                      {quote.agreement.origins?.name} → {quote.agreement.destinations?.name}
                    </span>
                  </div>
                  
                  {mode === "air" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Actual Weight:</span>
                        <span>{quote.calculation.actualWeight} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Volumetric Weight:</span>
                        <span>{quote.calculation.volumetricWeight} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Chargeable Weight:</span>
                        <span className="font-medium">{quote.calculation.chargeableWeight} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rate per kg:</span>
                        <span>{quote.agreement.currency} {quote.agreement.sell_price.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  {mode === "sea_lcl" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total CBM:</span>
                        <span className="font-medium">{quote.calculation.totalCBM} m³</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rate per CBM:</span>
                        <span>{quote.agreement.currency} {quote.agreement.sell_price.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  {mode === "sea_fcl" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Container:</span>
                        <span className="font-medium">{quote.calculation.containerType.replace("SEA_CONTAINER_", "")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span>{quote.calculation.capacity} m³</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span>{quote.calculation.dimensions}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Price:</span>
                      <span className="text-primary">
                        {quote.agreement.currency} {quote.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full" size="lg">
                  Submit Shipment Request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Educational Content Section */}
        <div className="mt-12 space-y-8">
          {/* Introduction */}
          <section className="prose prose-slate max-w-none">
            <h2 className="text-3xl font-bold mb-4">Cubic Meter Calculator</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our cubic meter calculator helps you quickly and accurately calculate the volume of your cargo in cubic meters (m³). With this tool, you can enter the dimensions of a single package or multiple products and instantly get the CBM value.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You can enter package dimensions in centimeters (cm), millimeters (mm), meters (m), inches (in), feet (ft), or yards (yd), making it flexible for users worldwide. The calculator automatically converts the entered values into cubic meters and cubic feet, so you can easily compare both units.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This CBM calculator is especially useful for shipping, freight forwarding, and logistics planning, as it helps determine how much space your cargo will occupy inside a container. You can also check how many products will fit into standard shipping containers such as 20ft, 40ft, and 40ft High Cube.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you are exporting goods, planning air freight, or calculating volumetric weight for courier shipments, our cubic meter calculator makes the process simple and reliable.
            </p>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-2xl font-semibold mb-4">With this tool, you can:</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Calculate CBM for single or multiple packages</li>
              <li>Convert between cubic meters and cubic feet</li>
              <li>Optimize container loading for sea freight</li>
              <li>Estimate volumetric weight for air and courier shipments</li>
            </ul>
          </section>

          {/* Formula */}
          <section className="bg-muted/50 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold mb-4">Cubic Meter Calculator Formula</h3>
            <div className="bg-background p-4 rounded border font-mono text-sm mb-4">
              Length (in centimeter) × Width (in centimeter) × Height (in centimeter) / 1,000,000 = Cubic meter (m³)
            </div>
            <p className="text-muted-foreground">
              We can input dimensions in Centimeter, millimeter, meter, inch, feet or yard
            </p>
          </section>

          {/* How to Use */}
          <section>
            <h3 className="text-2xl font-semibold mb-4">How to use Cubic Meter Calculator in Meter for Multiple Products?</h3>
            <p className="text-muted-foreground mb-4">
              On this calculator you can add up to 10 products to get Volume Weight in meter (m³), Volume Weight in feet (ft³), Number of Packages Minimum & Maximum in Standard 20 FT Container, Number of Packages Minimum & Maximum in Standard 40 FT Container, and Number of packages Minimum & Maximum in Standard 40 FT High Cube Container.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mt-6">
              {/* Steps */}
              <div>
                <h4 className="text-xl font-semibold mb-3">Steps (in case you enter dimensions in cm):</h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-semibold">Length (cm):</dt>
                    <dd className="text-muted-foreground">Your package length in centimeter</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Breadth (cm):</dt>
                    <dd className="text-muted-foreground">Your package breadth in centimeter</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Height (cm):</dt>
                    <dd className="text-muted-foreground">Your package height in centimeter</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Weight (kg):</dt>
                    <dd className="text-muted-foreground">Your package weight in kilogram</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Quantity:</dt>
                    <dd className="text-muted-foreground">Number of packages, it only affects the Weight, Volume Weight, and shipment volume.</dd>
                  </div>
                </dl>
              </div>

              {/* Results */}
              <div>
                <h4 className="text-xl font-semibold mb-3">Results:</h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-semibold">Weight kg/lbs:</dt>
                    <dd className="text-muted-foreground">Shipment weight in kg/lbs</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Volume Weight kg/lbs:</dt>
                    <dd className="text-muted-foreground">Volume weight of shipment in kg/lbs</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Volume m³/ft³:</dt>
                    <dd className="text-muted-foreground">Shipment volume in m³/ft³</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">20 FT min/max:</dt>
                    <dd className="text-muted-foreground">Approx. minimum & maximum of packages which can be placed inside standard 20 FT container</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">40 FT min/max:</dt>
                    <dd className="text-muted-foreground">Approx. minimum & maximum number of packages which can be placed inside standard 40 FT container</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">40 FT HC min/max:</dt>
                    <dd className="text-muted-foreground">Approx. minimum & maximum number of packages which can be placed inside standard 40 FT High Cube container</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* Container Dimensions Table */}
          <section>
            <h3 className="text-2xl font-semibold mb-4">Container Dimensions</h3>
            <p className="text-muted-foreground mb-4">For above calculation we had used following container dimensions:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-3 text-left font-semibold">Container / Dimensions</th>
                    <th className="border border-border px-4 py-3 text-left font-semibold">Length (cm)</th>
                    <th className="border border-border px-4 py-3 text-left font-semibold">Width (cm)</th>
                    <th className="border border-border px-4 py-3 text-left font-semibold">Height (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-3">20 FT Container</td>
                    <td className="border border-border px-4 py-3">589</td>
                    <td className="border border-border px-4 py-3">230</td>
                    <td className="border border-border px-4 py-3">230</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-4 py-3">40 FT Container</td>
                    <td className="border border-border px-4 py-3">1200</td>
                    <td className="border border-border px-4 py-3">230</td>
                    <td className="border border-border px-4 py-3">230</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-3">40 FT HIGH CUBE Container</td>
                    <td className="border border-border px-4 py-3">1200</td>
                    <td className="border border-border px-4 py-3">230</td>
                    <td className="border border-border px-4 py-3">260</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQs */}
          <section>
            <h3 className="text-2xl font-semibold mb-6">Frequently Asked Questions (FAQs)</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold mb-2">What is a cubic meter (CBM)?</h4>
                <p className="text-muted-foreground">
                  A cubic meter (m³) is a unit of volume that represents the space occupied by a cube measuring 1 meter × 1 meter × 1 meter. In shipping, CBM is used to calculate how much space cargo will take inside a container.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2">How do I calculate CBM manually?</h4>
                <p className="text-muted-foreground mb-2">To calculate CBM:</p>
                <div className="bg-muted/50 p-3 rounded font-mono text-sm">
                  CBM = Length (m) × Width (m) × Height (m)
                </div>
                <p className="text-muted-foreground mt-2">
                  If your measurements are in cm, mm, inches, or feet, convert them to meters first before multiplying.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2">Why is CBM important in shipping?</h4>
                <p className="text-muted-foreground">
                  CBM helps shipping companies determine how much cargo can fit inside a container. Freight charges are often calculated based on either weight or CBM, whichever is higher, making it crucial for cost estimation.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2">How many cubic meters are in a 20ft container?</h4>
                <p className="text-muted-foreground">
                  A standard 20ft container can hold approximately 33.2 CBM of cargo, depending on the cargo's shape and packing method.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2">How many cubic feet are in one cubic meter?</h4>
                <p className="text-muted-foreground">
                  1 cubic meter (m³) equals 35.315 cubic feet (ft³).
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default ShippingCalculatorNew;
