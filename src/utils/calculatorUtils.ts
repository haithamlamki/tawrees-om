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

// Convert cubic meters to cubic feet
export const convertCBMtoFT3 = (cbm: number): number => {
  return cbm * 35.3147;
};

// Convert kg to lb
export const convertKgToLb = (kg: number): number => {
  return kg * 2.20462;
};

// Calculate volumetric weight in kg for sea freight (1 CBM = 1000 kg)
export const calculateSeaVolumetricWeight = (cbm: number): number => {
  return cbm * 1000;
};

// Calculate individual item volume in CBM
export const calculateItemCBM = (item: ShipmentItem): number => {
  const lengthCm = convertToCm(item.length, item.dimensionUnit);
  const widthCm = convertToCm(item.width, item.dimensionUnit);
  const heightCm = convertToCm(item.height, item.dimensionUnit);
  return (lengthCm * widthCm * heightCm * item.quantity) / CBM_DIVISOR;
};

// Calculate individual item weight in kg
export const calculateItemWeight = (item: ShipmentItem): number => {
  const weightKg = convertToKg(item.weight, item.weightUnit);
  return weightKg * item.quantity;
};

// Generate unique tracking number
export const generateTrackingNumber = (): string => {
  return 'TRK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
};
