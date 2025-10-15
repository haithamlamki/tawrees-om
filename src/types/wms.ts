// WMS (Warehouse Management System) TypeScript Interfaces

export interface WMSCustomer {
  id: string;
  company_name: string;
  customer_code: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WMSCustomerUser {
  id: string;
  user_id: string;
  customer_id: string;
  branch_id?: string;
  role: 'owner' | 'admin' | 'employee' | 'accountant' | 'viewer';
  created_at: string;
}

export interface WMSCustomerBranch {
  id: string;
  customer_id: string;
  branch_name: string;
  branch_code: string;
  address: string;
  city: string;
  phone?: string;
  is_main_branch: boolean;
  created_at: string;
  updated_at: string;
}

export interface WMSContract {
  id: string;
  customer_id: string;
  contract_number: string;
  contract_type: string;
  contract_date?: string;
  duration_months: number;
  monthly_fee: number;
  storage_space_sqm?: number;
  storage_conditions?: string;
  free_transfer_count: number;
  transfer_price_after_limit: number;
  total_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'expired';
  network_name?: string;
  email?: string;
  phone?: string;
  responsible_person?: string;
  address?: string;
  gateway_username?: string;
  gateway_password?: string;
  create_account?: boolean;
  notes?: string;
  created_user_id?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    company_name: string;
  };
}

export interface WMSInventory {
  id: string;
  customer_id: string;
  sku: string;
  product_name: string;
  category?: string;
  quantity: number;
  consumed_quantity: number;
  unit: string;
  price_per_unit?: number;
  minimum_quantity: number;
  description?: string;
  image_url?: string;
  status: 'available' | 'low' | 'out_of_stock';
  created_at: string;
  updated_at: string;
}

export interface WMSOrder {
  id: string;
  customer_id: string;
  order_number: string;
  delivery_branch_id?: string;
  status: 'pending' | 'pending_approval' | 'approved' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  total_amount: number;
  notes?: string;
  delivered_at?: string;
  delivery_notes?: string;
  delivery_confirmed_by_customer?: boolean;
  customer_confirmed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WMSOrderItem {
  id: string;
  order_id: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface WMSOrderBranchItem {
  id: string;
  order_id: string;
  order_item_id: string;
  branch_id: string;
  quantity: number;
  created_at: string;
}

export interface WMSOrderApproval {
  id: string;
  order_id: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WMSInvoice {
  id: string;
  customer_id: string;
  order_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WMSProductRequest {
  id: string;
  customer_id: string;
  requested_by: string;
  product_name: string;
  description?: string;
  specifications?: string;
  requested_quantity: number;
  image_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  reviewer_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WMSDriver {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  license_number?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  status: 'available' | 'busy' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface WMSWorkflowSettings {
  id: string;
  customer_id?: string;
  require_order_approval: boolean;
  auto_approve_threshold?: number;
  default_approver_id?: string;
  notification_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Extended types for joined data
export interface WMSOrderWithDetails extends WMSOrder {
  customer?: WMSCustomer;
  branch?: WMSCustomerBranch;
  items?: WMSOrderItemWithInventory[];
  approvals?: WMSOrderApproval[];
}

export interface WMSOrderItemWithInventory extends WMSOrderItem {
  inventory?: WMSInventory;
}

export interface WMSInvoiceWithDetails extends WMSInvoice {
  customer?: WMSCustomer;
  order?: WMSOrder;
}
