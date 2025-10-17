export interface ShipmentItem {
  id: string;
  length: number;
  width: number;
  height: number;
  dimensionUnit: "cm" | "m" | "in";
  weight: number;
  weightUnit: "kg" | "lb";
  quantity: number;
  productName?: string;
  productImage?: string;
}

export interface QuoteBreakdown {
  baseRate: number;
  surcharges: {
    type: string;
    amount: number;
  }[];
  margin: {
    type: "percentage" | "flat";
    value: number;
    amount: number;
  };
  subtotal: number;
  total: number;
  calculations: {
    totalCBM?: number;
    totalWeight?: number;
    volumetricWeight?: number;
    chargeableWeight?: number;
    minCharge?: number;
  };
}

export interface CalculatorState {
  shippingType: "sea" | "air";
  seaMethod: "cbm" | "container";
  selectedContainer: string;
  items: ShipmentItem[];
  quote: QuoteBreakdown | null;
  validUntil: Date | null;
}

// Constants for calculations
export const IATA_DIVISOR = 6000; // For air volumetric weight
export const CBM_DIVISOR = 1000000; // For sea CBM calculation

// Unit conversion factors to cm/kg
export const DIMENSION_CONVERSIONS = {
  cm: 1,
  m: 100,
  in: 2.54,
};

export const WEIGHT_CONVERSIONS = {
  kg: 1,
  lb: 0.453592,
};
