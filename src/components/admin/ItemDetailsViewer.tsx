import { ShipmentItem } from "@/types/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Image as ImageIcon } from "lucide-react";
import { isValidBase64Image, getPlaceholderImage, openImageLightbox } from "@/utils/imageUtils";
import { DIMENSION_CONVERSIONS, WEIGHT_CONVERSIONS, CBM_DIVISOR, IATA_DIVISOR } from "@/types/calculator";
import { useTranslation } from "react-i18next";

interface ItemDetailsViewerProps {
  items: ShipmentItem[];
  shippingType: "air" | "sea";
  calculationMethod?: "cbm" | "container";
  containerType?: string;
  totalCBM?: number;
  totalWeight?: number;
  chargeableWeight?: number;
  containerUtilization?: number;
  compact?: boolean;
}

export function ItemDetailsViewer({
  items,
  shippingType,
  calculationMethod,
  containerType,
  totalCBM,
  totalWeight,
  chargeableWeight,
  containerUtilization,
  compact = false,
}: ItemDetailsViewerProps) {
  const { t } = useTranslation();

  // Calculate individual item metrics
  const calculateItemMetrics = (item: ShipmentItem) => {
    const lengthCm = item.length * DIMENSION_CONVERSIONS[item.dimensionUnit];
    const widthCm = item.width * DIMENSION_CONVERSIONS[item.dimensionUnit];
    const heightCm = item.height * DIMENSION_CONVERSIONS[item.dimensionUnit];
    const weightKg = item.weight * WEIGHT_CONVERSIONS[item.weightUnit];

    const volumeCm3 = lengthCm * widthCm * heightCm;
    const cbmPerItem = volumeCm3 / CBM_DIVISOR;
    const totalCbm = cbmPerItem * item.quantity;

    const volumetricWeightKg = volumeCm3 / IATA_DIVISOR;
    const totalVolumetricWeight = volumetricWeightKg * item.quantity;

    return {
      cbmPerItem,
      totalCbm,
      weightKg,
      totalWeight: weightKg * item.quantity,
      volumetricWeightKg,
      totalVolumetricWeight,
    };
  };

  const handleImageClick = (image: string, productName?: string) => {
    if (isValidBase64Image(image)) {
      openImageLightbox(image, productName);
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No items found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Item Details ({items.length} {items.length === 1 ? 'item' : 'items'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {!compact && <TableHead className="w-16">Image</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                {shippingType === "sea" && <TableHead className="text-right">CBM</TableHead>}
                {shippingType === "air" && <TableHead className="text-right">Vol. Weight</TableHead>}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const metrics = calculateItemMetrics(item);
                return (
                  <TableRow key={index}>
                    {!compact && (
                      <TableCell>
                        {item.productImage && isValidBase64Image(item.productImage) ? (
                          <img
                            src={item.productImage}
                            alt={item.productName || "Product"}
                            className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleImageClick(item.productImage!, item.productName)}
                            title="Click to view larger"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="min-w-[120px]">
                        {item.productName ? (
                          <span className="font-medium">{item.productName}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Item {index + 1}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.length} × {item.width} × {item.height} {item.dimensionUnit}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.weight} {item.weightUnit}
                        <div className="text-xs text-muted-foreground">
                          ({metrics.weightKg.toFixed(2)} kg)
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    {shippingType === "sea" && (
                      <TableCell className="text-right">
                        <div className="text-sm font-medium">
                          {metrics.totalCbm.toFixed(3)} m³
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {metrics.cbmPerItem.toFixed(4)} × {item.quantity}
                        </div>
                      </TableCell>
                    )}
                    {shippingType === "air" && (
                      <TableCell className="text-right">
                        <div className="text-sm font-medium">
                          {metrics.totalVolumetricWeight.toFixed(2)} kg
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {metrics.volumetricWeightKg.toFixed(2)} × {item.quantity}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">
                        {metrics.totalWeight.toFixed(2)} kg
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Section */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Items</p>
              <p className="text-lg font-bold">{items.reduce((sum, item) => sum + item.quantity, 0)}</p>
            </div>
            
            {totalWeight !== undefined && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Weight</p>
                <p className="text-lg font-bold">{totalWeight.toFixed(2)} kg</p>
              </div>
            )}

            {shippingType === "sea" && totalCBM !== undefined && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total CBM</p>
                <p className="text-lg font-bold">{totalCBM.toFixed(3)} m³</p>
              </div>
            )}

            {shippingType === "air" && chargeableWeight !== undefined && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Chargeable Weight</p>
                <p className="text-lg font-bold">{chargeableWeight.toFixed(2)} kg</p>
              </div>
            )}

            {calculationMethod === "container" && containerType && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Container</p>
                <p className="text-lg font-bold">{containerType}</p>
                {containerUtilization !== undefined && (
                  <p className="text-xs mt-1">
                    <Badge 
                      variant={containerUtilization > 95 ? "destructive" : containerUtilization > 80 ? "default" : "secondary"}
                    >
                      {containerUtilization.toFixed(1)}% utilized
                    </Badge>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
