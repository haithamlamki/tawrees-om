import {
  ShipmentItem,
  IATA_DIVISOR,
  CBM_DIVISOR,
  DIMENSION_CONVERSIONS,
  WEIGHT_CONVERSIONS,
} from "@/types/calculator";

export const convertToCm = (value: number, unit: "cm" | "m" | "in"): number => {
  return value * DIMENSION_CONVERSIONS[unit];
};

export const convertToKg = (value: number, unit: "kg" | "lb"): number => {
  return value * WEIGHT_CONVERSIONS[unit];
};

export const calculateCBM = (items: ShipmentItem[]): number => {
  return items.reduce((total, item) => {
    const lengthCm = convertToCm(item.length, item.dimensionUnit);
    const widthCm = convertToCm(item.width, item.dimensionUnit);
    const heightCm = convertToCm(item.height, item.dimensionUnit);
    const itemCBM = (lengthCm * widthCm * heightCm * item.quantity) / CBM_DIVISOR;
    return total + itemCBM;
  }, 0);
};

export const calculateActualWeight = (items: ShipmentItem[]): number => {
  return items.reduce((total, item) => {
    const weightKg = convertToKg(item.weight, item.weightUnit);
    return total + weightKg * item.quantity;
  }, 0);
};

export const calculateVolumetricWeight = (items: ShipmentItem[]): number => {
  return items.reduce((total, item) => {
    const lengthCm = convertToCm(item.length, item.dimensionUnit);
    const widthCm = convertToCm(item.width, item.dimensionUnit);
    const heightCm = convertToCm(item.height, item.dimensionUnit);
    const volumetricKg = (lengthCm * widthCm * heightCm * item.quantity) / IATA_DIVISOR;
    return total + volumetricKg;
  }, 0);
};

export const calculateChargeableWeight = (items: ShipmentItem[]): number => {
  const actualWeight = calculateActualWeight(items);
  const volumetricWeight = calculateVolumetricWeight(items);
  return Math.max(actualWeight, volumetricWeight);
};

export const generateItemId = (): string => {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
