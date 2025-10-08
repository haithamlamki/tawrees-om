import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WMSCustomer } from "@/types/wms";

export const useWMSCustomer = () => {
  return useQuery({
    queryKey: ["wms-customer"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get customer ID from wms_customer_users table
      const { data: customerUser, error: customerUserError } = await supabase
        .from("wms_customer_users")
        .select("customer_id")
        .eq("user_id", user.user.id)
        .single();

      if (customerUserError || !customerUser) return null;

      // Get customer details
      const { data: customer, error: customerError } = await supabase
        .from("wms_customers")
        .select("*")
        .eq("id", customerUser.customer_id)
        .single();

      if (customerError) throw customerError;
      return customer as WMSCustomer;
    },
  });
};
