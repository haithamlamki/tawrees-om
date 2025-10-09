import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WMSPermissions {
  canCreateOrders: boolean;
  canApproveOrders: boolean;
  canManageUsers: boolean;
  canManageWorkflow: boolean;
  canViewInvoices: boolean;
  canManageInvoices: boolean;
  canViewAllOrders: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isAccountant: boolean;
  isViewer: boolean;
  role: string | null;
  customerId: string | null;
}

export const useWMSPermissions = () => {
  return useQuery({
    queryKey: ["wms-permissions"],
    queryFn: async (): Promise<WMSPermissions> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          canCreateOrders: false,
          canApproveOrders: false,
          canManageUsers: false,
          canManageWorkflow: false,
          canViewInvoices: false,
          canManageInvoices: false,
          canViewAllOrders: false,
          isOwner: false,
          isAdmin: false,
          isEmployee: false,
          isAccountant: false,
          isViewer: false,
          role: null,
          customerId: null
        };
      }

      // Get customer user role
      const { data: customerUser } = await supabase
        .from("wms_customer_users")
        .select("role, customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = customerUser?.role || null;
      const customerId = customerUser?.customer_id || null;

      // Define permissions based on role
      const isOwner = role === 'owner';
      const isAdmin = role === 'admin';
      const isEmployee = role === 'employee';
      const isAccountant = role === 'accountant';
      const isViewer = role === 'viewer';

      return {
        canCreateOrders: isOwner || isAdmin || isEmployee,
        canApproveOrders: isOwner || isAdmin,
        canManageUsers: isOwner || isAdmin,
        canManageWorkflow: isOwner || isAdmin,
        canViewInvoices: isOwner || isAdmin || isAccountant,
        canManageInvoices: isOwner || isAdmin || isAccountant,
        canViewAllOrders: isOwner || isAdmin,
        isOwner,
        isAdmin,
        isEmployee,
        isAccountant,
        isViewer,
        role,
        customerId
      };
    },
  });
};