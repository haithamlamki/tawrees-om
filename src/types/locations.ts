export interface Origin {
  id: string;
  name: string;
  is_port: boolean;
  country: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type RateType =
  | "AIR_KG"
  | "SEA_CBM"
  | "SEA_CONTAINER_20"
  | "SEA_CONTAINER_40"
  | "SEA_CONTAINER_40HC"
  | "SEA_CONTAINER_45HC";

export interface Agreement {
  id: string;
  partner_id: string | null;
  origin_id: string;
  destination_id: string;
  rate_type: RateType;
  currency: string;
  buy_price: number;
  sell_price: number;
  margin_percent: number;
  min_charge: number | null;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relations populated by joins
  origins?: Origin;
  destinations?: Destination;
}

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  AIR_KG: "Air Freight (per kg)",
  SEA_CBM: "Sea LCL (per CBM)",
  SEA_CONTAINER_20: "20' Standard Container",
  SEA_CONTAINER_40: "40' Standard Container",
  SEA_CONTAINER_40HC: "40' High Cube Container",
  SEA_CONTAINER_45HC: "45' High Cube Container",
};

export const CONTAINER_DIMENSIONS = {
  SEA_CONTAINER_20: { length: 5.9, width: 2.35, height: 2.39, capacity: 33 },
  SEA_CONTAINER_40: { length: 12.03, width: 2.35, height: 2.39, capacity: 67 },
  SEA_CONTAINER_40HC: { length: 12.03, width: 2.35, height: 2.69, capacity: 76 },
  SEA_CONTAINER_45HC: { length: 13.56, width: 2.35, height: 2.69, capacity: 86 },
};
