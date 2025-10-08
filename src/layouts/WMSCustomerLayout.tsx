import { Outlet, Navigate } from "react-router-dom";
import { WMSNavigation } from "@/components/WMSNavigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package } from "lucide-react";

export const WMSCustomerLayout = () => {
  // Check if user has store_customer role
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["user-wms-roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      return data?.map((r) => r.role) || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect if user doesn't have store_customer role
  if (!userRoles?.includes("store_customer") && !userRoles?.includes("branch_manager") && !userRoles?.includes("admin")) {
    return <Navigate to="/" replace />;
  }

  const role = userRoles.includes("admin") ? "admin" : userRoles.includes("branch_manager") ? "branch_manager" : "store_customer";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="w-64 border-r min-h-screen bg-card p-6">
          <div className="mb-6 flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Warehouse</h2>
              <p className="text-xs text-muted-foreground">WMS Portal</p>
            </div>
          </div>
          <WMSNavigation userRole={role} />
        </aside>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
