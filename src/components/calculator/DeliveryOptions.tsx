import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Package, MapPin } from "lucide-react";

interface DeliveryOptionsProps {
  deliveryType: "pickup" | "door_delivery";
  onDeliveryTypeChange: (type: "pickup" | "door_delivery") => void;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryCountry?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  onAddressChange: (field: string, value: string) => void;
}

export const DeliveryOptions = ({
  deliveryType,
  onDeliveryTypeChange,
  deliveryAddress,
  deliveryCity,
  deliveryPostalCode,
  deliveryCountry,
  deliveryContactName,
  deliveryContactPhone,
  onAddressChange,
}: DeliveryOptionsProps) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label className="text-base font-semibold mb-3 block">Delivery Option</Label>
          <RadioGroup
            value={deliveryType}
            onValueChange={(value) => onDeliveryTypeChange(value as "pickup" | "door_delivery")}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                <Package className="h-5 w-5" />
                <div>
                  <div className="font-medium">Pickup</div>
                  <div className="text-xs text-muted-foreground">Collect from warehouse</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="door_delivery" id="door_delivery" />
              <Label htmlFor="door_delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                <MapPin className="h-5 w-5" />
                <div>
                  <div className="font-medium">Door Delivery</div>
                  <div className="text-xs text-muted-foreground">Deliver to your address</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {deliveryType === "door_delivery" && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Delivery Address</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="deliveryContactName">Contact Name</Label>
                <Input
                  id="deliveryContactName"
                  value={deliveryContactName || ""}
                  onChange={(e) => onAddressChange("deliveryContactName", e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="deliveryContactPhone">Contact Phone</Label>
                <Input
                  id="deliveryContactPhone"
                  value={deliveryContactPhone || ""}
                  onChange={(e) => onAddressChange("deliveryContactPhone", e.target.value)}
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="deliveryAddress">Street Address</Label>
                <Input
                  id="deliveryAddress"
                  value={deliveryAddress || ""}
                  onChange={(e) => onAddressChange("deliveryAddress", e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div>
                <Label htmlFor="deliveryCity">City</Label>
                <Input
                  id="deliveryCity"
                  value={deliveryCity || ""}
                  onChange={(e) => onAddressChange("deliveryCity", e.target.value)}
                  placeholder="City"
                />
              </div>

              <div>
                <Label htmlFor="deliveryPostalCode">Postal Code</Label>
                <Input
                  id="deliveryPostalCode"
                  value={deliveryPostalCode || ""}
                  onChange={(e) => onAddressChange("deliveryPostalCode", e.target.value)}
                  placeholder="Postal code"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="deliveryCountry">Country</Label>
                <Input
                  id="deliveryCountry"
                  value={deliveryCountry || ""}
                  onChange={(e) => onAddressChange("deliveryCountry", e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
