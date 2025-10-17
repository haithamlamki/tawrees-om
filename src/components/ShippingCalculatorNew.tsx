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
import { useTranslation } from "react-i18next";
import ItemRow from "./calculator/ItemRow";
import { ContainerCard } from "./calculator/ContainerCard";
import { DeliveryOptions } from "./calculator/DeliveryOptions";
import { ExportButtons } from "./calculator/ExportButtons";
import { ShippingRatesDisplay } from "./calculator/ShippingRatesDisplay";
import { exportToPDF, exportToExcel } from "@/utils/exportUtils";
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
  const { i18n } = useTranslation();
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
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | undefined>();

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
        dimensionUnit: "m",
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

  const fetchShippingRates = async () => {
    if (!selectedOrigin || !selectedDestination) return;
    
    setLoadingRates(true);
    setRatesError(undefined);

    try {
      const originData = origins.find(o => o.id === selectedOrigin);
      const destData = destinations.find(d => d.id === selectedDestination);
      
      const weight = calculateActualWeight(items);
      const volume = mode === "sea_lcl" || mode === "air" ? calculateCBM(items) : 0;

      const { data, error } = await supabase.functions.invoke('get-shipping-rates', {
        body: {
          origin: originData?.name || '',
          destination: destData?.name || '',
          weight,
          volume,
          shippingType: mode === 'air' ? 'air' : 'sea'
        }
      });

      if (error) throw error;
      
      setShippingRates(data?.rates || []);
    } catch (error: any) {
      console.error('Error fetching shipping rates:', error);
      setRatesError('Unable to fetch live shipping rates at this time');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleExportPDF = async () => {
    if (!quote) return;

    await exportToPDF({
      shippingType: mode === 'air' ? 'air' : 'sea',
      items,
      quote: {
        baseRate: quote.totalPrice,
        surcharges: [],
        margin: { type: 'flat', value: 0, amount: 0 },
        subtotal: quote.totalPrice,
        total: quote.totalPrice,
        calculations: quote.calculation
      },
      shippingRates,
      deliveryType: deliveryType === 'pickup' ? 'Pickup from Port' : 'Door-to-Door Delivery',
      deliveryCity: deliveryAddress.city,
      containerType: selectedContainer ? selectedContainer.replace('SEA_CONTAINER_', '') + 'ft' : undefined,
      language: i18n.language as 'en' | 'ar' | 'zh-CN'
    });
  };

  const handleExportExcel = () => {
    if (!quote) return;

    exportToExcel({
      shippingType: mode === 'air' ? 'air' : 'sea',
      items,
      quote: {
        baseRate: quote.totalPrice,
        surcharges: [],
        margin: { type: 'flat', value: 0, amount: 0 },
        subtotal: quote.totalPrice,
        total: quote.totalPrice,
        calculations: quote.calculation
      },
      shippingRates,
      deliveryType: deliveryType === 'pickup' ? 'Pickup from Port' : 'Door-to-Door Delivery',
      deliveryCity: deliveryAddress.city,
      containerType: selectedContainer ? selectedContainer.replace('SEA_CONTAINER_', '') + 'ft' : undefined,
      language: i18n.language as 'en' | 'ar' | 'zh-CN'
    });
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
                onClick={() => {
                  calculateQuote();
                  fetchShippingRates();
                }}
                disabled={isCalculateDisabled()}
                className="w-full"
                size="lg"
              >
                <CalcIcon className="mr-2 h-5 w-5" />
                Calculate Shipping Cost
              </Button>
            </div>

            {/* Shipping Rates Display */}
            {(loadingRates || shippingRates.length > 0 || ratesError) && (
              <div className="mt-6">
                <ShippingRatesDisplay
                  rates={shippingRates}
                  loading={loadingRates}
                  error={ratesError}
                />
              </div>
            )}

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

                {/* Export Buttons */}
                <div className="mt-4">
                  <ExportButtons
                    onExportPDF={handleExportPDF}
                    onExportExcel={handleExportExcel}
                    disabled={false}
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" size="lg">
                  Submit Shipment Request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ShippingCalculatorNew;
