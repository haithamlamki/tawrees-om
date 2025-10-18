import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plane, Ship, Package, Calculator as CalcIcon, Plus, Trash2 } from "lucide-react";
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
  const [fclUnitSystem, setFclUnitSystem] = useState<"metric" | "imperial">("metric");
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
                  {/* Chargeable Weight Calculator Header */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Chargeable Weight Calculator</h3>
                    
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-3">Enter Package Details</h4>
                      
                      {/* DIM Factor Selector - Fixed for Air Freight */}
                      <div className="mb-4">
                        <Label className="text-sm mb-2 block">Select Chargeable Weight DIM (Dimensional) Factor</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <Button variant="outline" className="text-xs opacity-50 cursor-not-allowed" disabled>
                            Ocean LCL<br/>1:1000
                          </Button>
                          <Button variant="outline" className="text-xs opacity-50 cursor-not-allowed" disabled>
                            Truck LTL (EU)<br/>1:3000
                          </Button>
                          <Button variant="outline" className="text-xs opacity-50 cursor-not-allowed" disabled>
                            Express/Courier<br/>1:5000
                          </Button>
                          <Button variant="default" className="text-xs bg-primary">
                            Air Freight<br/>1:6000
                          </Button>
                        </div>
                      </div>
                      
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
                      
                      <Button onClick={addItem} variant="outline" className="w-full mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add more packages
                      </Button>
                      
                      {/* Total Summary */}
                      {items.some(item => item.length > 0 && item.width > 0 && item.height > 0) && (
                        <div className="mt-4 pt-4 border-t text-center text-sm font-medium">
                          Total Volume: {calculateCBM(items).toFixed(2)} m³, Total Weight: {calculateActualWeight(items).toFixed(0)} kg
                        </div>
                      )}
                    </div>
                    
                    {/* Calculation Result */}
                    {quote && mode === "air" && (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold mb-4">Calculation Result</h4>
                        
                        {/* First Row: Volume and Weight */}
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="border rounded p-3 bg-background text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Volume m³</div>
                            <div className="text-lg font-semibold">{calculateCBM(items).toFixed(2)}</div>
                          </div>
                          <div className="border rounded p-3 bg-background text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Volume ft³</div>
                            <div className="text-lg font-semibold">{(calculateCBM(items) * 35.3147).toFixed(3)}</div>
                          </div>
                          <div className="border rounded p-3 bg-background text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Weight (Kg)</div>
                            <div className="text-lg font-semibold">{calculateActualWeight(items).toFixed(0)}</div>
                          </div>
                          <div className="border rounded p-3 bg-background text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Weight (Lb)</div>
                            <div className="text-lg font-semibold">{(calculateActualWeight(items) * 2.20462).toFixed(3)}</div>
                          </div>
                        </div>
                        
                        {/* Second Row: Volumetric Weights */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="border rounded p-3 bg-background text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Volumetric Weight Kg</div>
                            <div className="text-lg font-semibold">{calculateVolumetricWeight(items).toFixed(3)}</div>
                          </div>
                          <div className="border rounded p-3 bg-background text-center">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Volumetric Weight lbs</div>
                            <div className="text-lg font-semibold">{(calculateVolumetricWeight(items) * 2.20462).toFixed(3)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                  {/* Unit Selection */}
                  <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-purple-900 dark:text-purple-100">Select Unit of Measurement</h4>
                    <RadioGroup value={fclUnitSystem} onValueChange={(v) => setFclUnitSystem(v as "metric" | "imperial")} className="flex gap-8">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="metric" id="metric" />
                        <Label htmlFor="metric" className="cursor-pointer">kg/cm</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="imperial" id="imperial" />
                        <Label htmlFor="imperial" className="cursor-pointer">lb/inch</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Container Selection Dropdown */}
                  <div>
                    <Label className="mb-2 block">Select Container</Label>
                    <Select 
                      value={selectedContainer || ""} 
                      onValueChange={(v) => setSelectedContainer(v as RateType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a container type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEA_CONTAINER_20">Standard 20 Feet</SelectItem>
                        <SelectItem value="SEA_CONTAINER_40">Standard 40 Feet</SelectItem>
                        <SelectItem value="SEA_CONTAINER_40HC">High Cube 40 Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Container Info */}
                  {selectedContainer && (() => {
                    const container = CONTAINER_DIMENSIONS[selectedContainer as keyof typeof CONTAINER_DIMENSIONS];
                    const lengthCm = container.length * 100;
                    const widthCm = container.width * 100;
                    const heightCm = container.height * 100;
                    const weightKg = selectedContainer === "SEA_CONTAINER_20" ? 21770 : 26680;
                    
                    return (
                      <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center text-sm">
                        <span>Dimensions : {lengthCm.toFixed(0)} X {widthCm.toFixed(0)} X {heightCm.toFixed(0)} cm</span>
                        <span>Volume : {container.capacity} m3</span>
                        <span>Weight : {weightKg} kg</span>
                      </div>
                    );
                  })()}

                  {/* Results Section */}
                  {selectedContainer && items.some(item => item.length > 0 && item.width > 0 && item.height > 0) && (() => {
                    const totalCBM = calculateCBM(items);
                    const totalWeight = calculateActualWeight(items);
                    const container = CONTAINER_DIMENSIONS[selectedContainer as keyof typeof CONTAINER_DIMENSIONS];
                    const volumePercent = Math.min((totalCBM / container.capacity) * 100, 100);
                    const maxWeight = selectedContainer === "SEA_CONTAINER_20" ? 21770 : 26680;
                    const weightPercent = Math.min((totalWeight / maxWeight) * 100, 100);

                    return (
                      <div className="bg-purple-100 dark:bg-purple-900/20 rounded-lg overflow-hidden">
                        <div className="bg-purple-200 dark:bg-purple-800/40 px-4 py-2">
                          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">Result</h4>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">Filled Volume : {totalCBM.toFixed(0)} m3</span>
                              <span className="text-sm font-bold bg-purple-600 text-white px-3 py-1 rounded">{volumePercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={volumePercent} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">Filled Weight : {totalWeight.toFixed(0)} kg.</span>
                              <span className="text-sm font-bold bg-purple-600 text-white px-3 py-1 rounded">{weightPercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={weightPercent} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Enter Product Details */}
                  {selectedContainer && (
                    <div className="bg-purple-100 dark:bg-purple-900/20 rounded-lg overflow-hidden">
                      <div className="bg-purple-200 dark:bg-purple-800/40 px-4 py-2">
                        <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">Enter product details</h4>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Table Header */}
                        <div className="grid grid-cols-8 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                          <div>Unit</div>
                          <div>Length</div>
                          <div>Width</div>
                          <div>Height</div>
                          <div>Weight</div>
                          <div>Unit</div>
                          <div>Quantity</div>
                          <div></div>
                        </div>
                        
                        {/* Product Rows */}
                        {items.map((item, index) => (
                          <div key={item.id} className="grid grid-cols-8 gap-2 items-center">
                            <Select 
                              value={item.dimensionUnit} 
                              onValueChange={(v) => updateItem(item.id, "dimensionUnit", v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cm">cm</SelectItem>
                                <SelectItem value="m">m</SelectItem>
                                <SelectItem value="in">in</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="number" 
                              value={item.length || ""} 
                              onChange={(e) => updateItem(item.id, "length", Number(e.target.value))}
                              className="h-9"
                            />
                            <Input 
                              type="number" 
                              value={item.width || ""} 
                              onChange={(e) => updateItem(item.id, "width", Number(e.target.value))}
                              className="h-9"
                            />
                            <Input 
                              type="number" 
                              value={item.height || ""} 
                              onChange={(e) => updateItem(item.id, "height", Number(e.target.value))}
                              className="h-9"
                            />
                            <Input 
                              type="number" 
                              value={item.weight || ""} 
                              onChange={(e) => updateItem(item.id, "weight", Number(e.target.value))}
                              className="h-9"
                            />
                            <Select 
                              value={item.weightUnit} 
                              onValueChange={(v) => updateItem(item.id, "weightUnit", v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="number" 
                              value={item.quantity || 1} 
                              onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                              className="h-9"
                              min="1"
                            />
                            {items.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="h-9 w-9 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        {/* Add More Row Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={addItem}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add more row
                        </Button>
                        
                        {/* Total Summary */}
                        {items.some(item => item.length > 0 && item.width > 0 && item.height > 0) && (
                          <div className="pt-3 border-t text-center text-sm font-medium text-purple-900 dark:text-purple-100">
                            Total Volume : {calculateCBM(items).toFixed(0)} m3, Total Weight : {calculateActualWeight(items).toFixed(0)} kg
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

        {/* Educational Content Section - Mode Specific */}
        {mode === "sea_lcl" && (
          <div className="mt-12 space-y-8">
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

            <section>
              <h3 className="text-2xl font-semibold mb-4">With this tool, you can:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Calculate CBM for single or multiple packages</li>
                <li>Convert between cubic meters and cubic feet</li>
                <li>Optimize container loading for sea freight</li>
                <li>Estimate volumetric weight for air and courier shipments</li>
              </ul>
            </section>

            <section className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-4">Cubic Meter Calculator Formula</h3>
              <div className="bg-background p-4 rounded border font-mono text-sm mb-4">
                Length (in centimeter) × Width (in centimeter) × Height (in centimeter) / 1,000,000 = Cubic meter (m³)
              </div>
              <p className="text-muted-foreground">
                We can input dimensions in Centimeter, millimeter, meter, inch, feet or yard
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">How to use Cubic Meter Calculator in Meter for Multiple Products?</h3>
              <p className="text-muted-foreground mb-4">
                On this calculator you can add up to 10 products to get Volume Weight in meter (m³), Volume Weight in feet (ft³), Number of Packages Minimum & Maximum in Standard 20 FT Container, Number of Packages Minimum & Maximum in Standard 40 FT Container, and Number of packages Minimum & Maximum in Standard 40 FT High Cube Container.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mt-6">
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
        )}

        {mode === "air" && (
          <div className="mt-12 space-y-8">
            <section className="prose prose-slate max-w-none">
              <h2 className="text-3xl font-bold mb-4">Volumetric Weight Calculator</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                If your parcel is large but lightweight, the shipping cost may be determined by its size rather than its weight. Our volumetric weight calculator can help you find the chargeable weight for your parcel. When sending bulky parcels, many couriers charge based on volumetric weight instead of actual weight. This weight is calculated from the dimensions of the parcel.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">What is Volumetric Weight?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Volumetric weight represents the calculated weight of a parcel based on its length, width, and height, converted to volumetric kilograms. The calculation method for volumetric weight can vary depending on the courier and the specific service. For example, some couriers may use different formulas for express versus economy services.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Why is Volumetric Weight Charged?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Larger items occupy more space on vehicles or aircraft, increasing the cost to transport them. Therefore, if an item is bulky but not heavy, shipping costs are often based on size instead of actual weight.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Calculate Volumetric Weight for Courier Delivery</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Different courier companies may use various formulas, but the most common method involves multiplying the parcel's three dimensions in centimeters and dividing by 5,000.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                No need to worry—the tool above automatically calculates this for you. However, if you'd like to do it manually, simply multiply the length, width, and height (in cm) of your parcel and then divide by 5,000.
              </p>
              <h4 className="text-xl font-semibold mb-3">Compare to Physical Weight</h4>
              <p className="text-muted-foreground leading-relaxed">
                If the volumetric weight is higher than the actual physical weight, your shipment will be billed based on the volumetric weight.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Calculate Volumetric Weight for Freight Delivery</h3>
              <p className="text-muted-foreground leading-relaxed">
                For most road freight, air freight services, and airlines, a divisor of 6,000 is used. To find the volumetric weight for freight, multiply the length, width, and height of the shipment in centimeters, then divide by 6,000.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Calculate Total Chargeable Weight of a Shipment</h3>
              <p className="text-muted-foreground leading-relaxed">
                Different couriers have their own methods for calculating the total chargeable weight, which can impact the cost significantly. It's important to understand how these variations might affect the final price of your shipment.
              </p>
            </section>

            <section className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-4">Why correct Volumetric Weight Calculation is important?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Accurate volumetric weight calculation is essential when shipping bulky packages with low actual weight because shipping costs are often based on the space a package occupies rather than its physical weight. This is particularly important for large, lightweight items that take up significant space in a cargo hold or container. By calculating the volumetric weight, which reflects the package's dimensions, shipping carriers can ensure that pricing accurately reflects the space utilized. Without this, carriers may incur losses from undercharged shipments, and shippers might face unexpected costs due to inaccurate weight estimates. Therefore, correctly calculating volumetric weight helps in fair cost allocation and efficient use of space, benefiting both carriers and customers.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">How to Use Volumetric Weight Calculator</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Select Divisor (Chargeable Weight DIM Factor): Choose the divisor according to your shipping agent. By default, the calculation uses a divisor of 1000.</li>
                <li>Select the Unit of Measurement for Package Dimensions (cm/mm/inch/meter/feet).</li>
                <li>Enter the Package Dimensions: Length, Width (Breadth), and Height.</li>
                <li>Select the Unit of Measurement for Package Weight (kg/lb).</li>
                <li>Enter the Package Weight.</li>
                <li>Enter the Package Quantity.</li>
                <li>Add More Packages using the "Add More Package" option.</li>
                <li>Delete a Package using the "Delete" icon.</li>
              </ol>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Understand the Result</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="font-semibold">Volume (m³):</dt>
                  <dd className="text-muted-foreground">Total volume of all packages in cubic meters.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Volume (ft³):</dt>
                  <dd className="text-muted-foreground">Total volume of all packages in cubic feet.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Weight (kg):</dt>
                  <dd className="text-muted-foreground">Total weight in kilograms (single package weight × quantity).</dd>
                </div>
                <div>
                  <dt className="font-semibold">Weight (lb):</dt>
                  <dd className="text-muted-foreground">Total weight in pounds (single package weight × quantity).</dd>
                </div>
                <div>
                  <dt className="font-semibold">Volumetric Weight (kg):</dt>
                  <dd className="text-muted-foreground">Total volumetric weight in kilograms.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Volumetric Weight (lb):</dt>
                  <dd className="text-muted-foreground">Total volumetric weight in pounds.</dd>
                </div>
              </dl>
            </section>
          </div>
        )}

        {mode === "sea_fcl" && (
          <div className="mt-12 space-y-8">
            <section className="prose prose-slate max-w-none">
              <h2 className="text-3xl font-bold mb-4">Single Shipping Container Calculator</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our Single Shipping Container Calculator allows you to easily check how much space your cargo occupies inside a selected container. Users can enter multiple packages, whether they are the same product or different product types, and the tool will calculate both volume utilization (%) and weight utilization (%) of the container.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This feature is especially useful for exporters, importers, freight forwarders, and logistics companies who need to know how efficiently their goods are filling a container. By understanding the occupied percentage of CBM (Cubic Meter) and weight, you can estimate whether the chosen container is the right size or if you need to switch to another container type for cost optimization.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You can select from standard shipping containers such as 20-foot, 40-foot, and 40-foot high cube. After entering the package dimensions and weights, the calculator will instantly show you:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Total cargo volume in cubic meters and cubic feet</li>
                <li>Total cargo weight in kilograms and pounds</li>
                <li>Percentage of container volume filled</li>
                <li>Percentage of container weight capacity utilized</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This helps you make smarter shipping decisions, reduce wasted space, and optimize freight costs. Whether you are shipping a single product in bulk or mixed cargo with different dimensions, the Single Shipping Container Calculator makes planning fast, simple, and accurate.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Container Utilization Calculator</h3>
              <p className="text-muted-foreground leading-relaxed">
                The CBM Calculator is a simple and accurate tool that helps you calculate how much cargo can fit inside a single shipping container. It works as a container utilization calculator, showing both volume percentage and weight percentage filled inside your selected container.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can use the calculator for different types of shipment containers, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-2">
                <li>Standard 20-Foot Container</li>
                <li>Standard 40-Foot Container</li>
                <li>High Cube 40-Foot Container</li>
                <li>Upgraded 20-Foot Container</li>
                <li>Reefer 20-Foot Container</li>
                <li>Reefer 40-Foot Container</li>
                <li>Reefer 40-Foot High Cube Container</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Once you select a container, you can add multiple products or packages. These can be of different dimensions and weights, making it easy to calculate cargo space for mixed shipments.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Package Information You Can Enter</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You can enter cargo details in different measurement units for flexibility:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3">Dimensions:</h4>
                  <p className="text-muted-foreground">Yard, Feet, Inch, Meter, Centimeter, or Millimeter</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-3">Product Weight:</h4>
                  <p className="text-muted-foreground">Kilograms (kg), Grams (g), or Pounds (lb)</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">
                For each product or package, you can specify:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-2">
                <li>Length</li>
                <li>Width (Breadth)</li>
                <li>Height</li>
                <li>Quantity</li>
                <li>Product Weight</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">What the Container Loading Calculator Shows</h3>
              <p className="text-muted-foreground leading-relaxed">
                The single shipping container calculator automatically calculates and displays:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-2">
                <li>Total Cargo Volume (CBM and Cubic Feet)</li>
                <li>Total Cargo Weight (kg and lb)</li>
                <li>Container-wise filled percentage of volume</li>
                <li>Container-wise filled percentage of weight</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This makes it easy to see how efficiently your cargo is utilizing the selected shipping container.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">How to Use the Single Shipping Container Calculator</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Select a Container – Choose from 20ft, 40ft, High Cube, or Reefer containers.</li>
                <li>Enter Package Details – Input product length, width, height, weight, and total quantity.</li>
                <li>View Results – Instantly see total cargo volume, total weight, and container utilization percentages.</li>
                <li>Add Multiple Products – Use the "Add More Row" option to calculate mixed shipments with different product sizes.</li>
                <li>Delete Products Anytime – Remove any product or package by clicking the "Delete" button.</li>
                <li>Switch Containers – Change the container type at any time to view updated calculations for your shipment.</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This tool is widely used by exporters, importers, freight forwarders, and logistics companies to plan shipments, optimize container space, and reduce transportation costs. Whether you're shipping a single product in bulk or multiple items with different dimensions, the CBM Calculator for shipping makes container planning quick, accurate, and hassle-free.
              </p>
            </section>

            <section className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-4">Example: How to Calculate Filled Volume & Weight %</h3>
              <p className="text-muted-foreground mb-4">Suppose you have the following cargo to ship:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Package dimensions: 60 cm × 40 cm × 40 cm</li>
                <li>Weight per package: 25 kg</li>
                <li>Quantity: 200 packages</li>
                <li>Selected container: 20ft Standard Container</li>
              </ul>
              <div className="mt-4 space-y-3">
                <p className="text-muted-foreground"><strong>Step 1:</strong> Enter package dimensions and weight into the calculator.</p>
                <p className="text-muted-foreground"><strong>Step 2:</strong> Enter the total quantity of packages.</p>
                <p className="text-muted-foreground"><strong>Step 3:</strong> Select "20ft Container."</p>
              </div>
              <div className="mt-4 bg-background p-4 rounded border">
                <h4 className="font-semibold mb-2">Result:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Total Cargo Volume = 19.2 m³ (678 ft³)</li>
                  <li>Total Cargo Weight = 5,000 kg (11,023 lbs)</li>
                  <li>20ft Container Volume Utilization = 34%</li>
                  <li>20ft Container Weight Utilization = 18%</li>
                </ul>
              </div>
              <p className="text-muted-foreground mt-4">
                This means your cargo uses 34% of the available space but only 18% of the weight limit. In this case, the cargo is light but bulky, and you might be able to fit more goods before reaching the maximum container volume.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-6">Frequently Asked Questions (FAQs)</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">How do I calculate container utilization?</h4>
                  <p className="text-muted-foreground">
                    Container utilization is calculated by dividing the total cargo volume (CBM) or cargo weight by the maximum capacity of the selected shipping container, then converting it into a percentage. Our calculator does this automatically and shows you both volume utilization and weight utilization.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">What is the maximum weight for a 20ft and 40ft container?</h4>
                  <p className="text-muted-foreground">
                    A 20ft container can usually carry up to around 28,000 kg (62,000 lbs) of cargo, depending on shipping line restrictions. A 40ft container can typically carry a similar weight, but has more volume space for lighter goods. Always check with your freight forwarder for exact limits.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">Why is container volume utilization important?</h4>
                  <p className="text-muted-foreground">
                    If your cargo fills only 50% of the container volume but reaches the maximum weight limit, you may be paying for unused space. On the other hand, if the container is filled by volume before reaching the weight limit, you may need to choose a larger container to avoid multiple shipments.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">Can I use this tool for mixed cargo shipments?</h4>
                  <p className="text-muted-foreground">
                    Yes. You can input different package sizes and weights, and the calculator will combine them to give you the overall filled percentage for the selected container.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">What is CBM in shipping?</h4>
                  <p className="text-muted-foreground">
                    CBM stands for Cubic Meter and is the standard unit used in shipping to measure the volume of cargo. It helps in determining how much space your cargo will occupy inside a container.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
};

export default ShippingCalculatorNew;
