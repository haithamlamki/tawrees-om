export type SurchargeType = 
  | 'fuel'
  | 'handling'
  | 'customs'
  | 'insurance'
  | 'qc'
  | 'storage'
  | 'demurrage'
  | 'documentation'
  | 'other';

export interface Surcharge {
  id: string;
  name: string;
  type: SurchargeType;
  amount: number;
  is_percentage: boolean;
  origin_id?: string;
  destination_id?: string;
  rate_type?: string;
  active: boolean;
  valid_from: string;
  valid_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentSurcharge {
  id: string;
  shipment_request_id: string;
  surcharge_id?: string;
  name: string;
  type: SurchargeType;
  amount: number;
  is_percentage: boolean;
  created_at: string;
}

export const SURCHARGE_TYPE_LABELS: Record<SurchargeType, string> = {
  fuel: 'Fuel Surcharge',
  handling: 'Handling Fee',
  customs: 'Customs Fee',
  insurance: 'Insurance',
  qc: 'Quality Check Fee',
  storage: 'Storage Fee',
  demurrage: 'Demurrage',
  documentation: 'Documentation Fee',
  other: 'Other Fee'
};
