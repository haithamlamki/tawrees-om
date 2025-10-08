export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data?: any;
  new_data?: any;
  changed_fields?: string[] | null;
  user_id?: string | null;
  user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}
