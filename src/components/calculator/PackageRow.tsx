import { ShipmentItem } from "@/types/calculator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  calculateItemCBM, 
  calculateItemWeight, 
  convertCBMtoFT3, 
  convertKgToLb,
  calculateSeaVolumetricWeight 
} from "@/utils/calculatorUtils";

interface PackageRowProps {
  item: ShipmentItem;
  index: number;
  onUpdate: (id: string, field: keyof ShipmentItem, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export const PackageRow = ({ item, index, onUpdate, onRemove, canRemove }: PackageRowProps) => {
  const { t } = useTranslation("calculator");
  
  // Calculate real-time results
  const volumeM3 = calculateItemCBM(item);
  const volumeFt3 = convertCBMtoFT3(volumeM3);
  const weightKg = calculateItemWeight(item);
  const weightLb = convertKgToLb(weightKg);
  const volumetricWtKg = calculateSeaVolumetricWeight(volumeM3);
  const volumetricWtLbs = convertKgToLb(volumetricWtKg);
  
  // Container estimates (simplified - per CBM pricing)
  const container20FT = volumeM3 > 0 ? Math.ceil(volumeM3 / 28) * 1000 : 0; // ~28 CBM per 20FT
  const container40FT = volumeM3 > 0 ? Math.ceil(volumeM3 / 58) * 1800 : 0; // ~58 CBM per 40FT
  const container40HC = volumeM3 > 0 ? Math.ceil(volumeM3 / 68) * 2000 : 0; // ~68 CBM per 40HC

  return (
    <div className="space-y-3">
      {/* Package Details Header */}
      <div className="bg-purple-100 px-4 py-2 rounded-t-lg border border-purple-200">
        <h4 className="text-sm font-semibold text-purple-900">
          {t("packageDetails")} {index + 1}
        </h4>
      </div>

      {/* Input Row */}
      <div className="grid grid-cols-7 gap-2 px-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("unit")}</label>
          <Select
            value={item.dimensionUnit}
            onValueChange={(value: "cm" | "m" | "in") => onUpdate(item.id, "dimensionUnit", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">CM</SelectItem>
              <SelectItem value="m">M</SelectItem>
              <SelectItem value="in">IN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("width")}</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.width || ""}
            onChange={(e) => onUpdate(item.id, "width", parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("height")}</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.height || ""}
            onChange={(e) => onUpdate(item.id, "height", parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("length")}</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.length || ""}
            onChange={(e) => onUpdate(item.id, "length", parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("weightPerBox")}</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.weight || ""}
            onChange={(e) => onUpdate(item.id, "weight", parseFloat(e.target.value) || 0)}
            className="h-9"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("unit")}</label>
          <Select
            value={item.weightUnit}
            onValueChange={(value: "kg" | "lb") => onUpdate(item.id, "weightUnit", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">KG</SelectItem>
              <SelectItem value="lb">LB</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t("quantity")}</label>
          <Input
            type="number"
            min="1"
            value={item.quantity || ""}
            onChange={(e) => onUpdate(item.id, "quantity", parseInt(e.target.value) || 1)}
            className="h-9"
          />
        </div>
      </div>

      {/* Calculation Results */}
      <div className="px-4 pb-3">
        <div className="border border-purple-200 rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-3 py-2 border-b border-purple-200">
            <h5 className="text-xs font-semibold text-purple-900">{t("calculationResult")}</h5>
          </div>
          
          {/* First Row: Volume and Weight */}
          <div className="grid grid-cols-4 divide-x divide-purple-100">
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("volumeM3")}</p>
              <p className="text-sm font-semibold text-purple-900">{volumeM3.toFixed(3)}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("volumeFt3")}</p>
              <p className="text-sm font-semibold text-purple-900">{volumeFt3.toFixed(2)}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("weightKg")}</p>
              <p className="text-sm font-semibold text-purple-900">{weightKg.toFixed(2)}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("weightLb")}</p>
              <p className="text-sm font-semibold text-purple-900">{weightLb.toFixed(2)}</p>
            </div>
          </div>

          {/* Second Row: Container Estimates and Volumetric Weight */}
          <div className="grid grid-cols-5 divide-x divide-purple-100 border-t border-purple-200 bg-purple-25">
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("container20FT")}</p>
              <p className="text-sm font-semibold text-purple-900">${container20FT}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("container40FT")}</p>
              <p className="text-sm font-semibold text-purple-900">${container40FT}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("container40HC")}</p>
              <p className="text-sm font-semibold text-purple-900">${container40HC}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("volumetricWtKg")}</p>
              <p className="text-sm font-semibold text-purple-900">{volumetricWtKg.toFixed(2)}</p>
            </div>
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">{t("volumetricWtLbs")}</p>
              <p className="text-sm font-semibold text-purple-900">{volumetricWtLbs.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        {canRemove && (
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t("removePackage")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
