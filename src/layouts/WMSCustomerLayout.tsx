import { Outlet, Navigate } from "react-router-dom";
import { WMSNavigation } from "@/components/WMSNavigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
  SidebarTrigger 
} from "@/components/ui/sidebar";

export const WMSCustomerLayout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is authenticated
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Check if user has store_customer role OR is a WMS user
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-wms-roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check system-wide roles
      const { data: systemRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      // Check WMS customer-specific roles
      const { data: wmsRole } = await supabase
        .from("wms_customer_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        systemRoles: systemRoles?.map((r) => r.role) || [],
        wmsRole: wmsRole?.role || null
      };
    },
    enabled: !!session,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/warehouse/auth");
  };

  if (sessionLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!session) {
    return <Navigate to="/warehouse/auth" replace />;
  }

  // Redirect if user doesn't have any WMS access
  const systemRoles = userRoles?.systemRoles || [];
  const wmsRole = userRoles?.wmsRole;
  
  const hasWMSAccess = 
    systemRoles.includes("store_customer") || 
    systemRoles.includes("branch_manager") || 
    systemRoles.includes("admin") ||
    systemRoles.includes("wms_employee") ||
    systemRoles.includes("wms_accountant") ||
    wmsRole !== null;

  if (!hasWMSAccess) {
    return <Navigate to="/" replace />;
  }

  // Determine user role with priority order
  let role = "user";
  
  if (systemRoles.includes("admin")) {
    role = "admin";
  } else if (systemRoles.includes("wms_employee") || wmsRole === "employee") {
    role = "wms_employee";
  } else if (systemRoles.includes("wms_accountant") || wmsRole === "accountant") {
    role = "wms_accountant";
  } else if (systemRoles.includes("branch_manager") || wmsRole === "admin") {
    role = "branch_manager";
  } else if (systemRoles.includes("store_customer") || wmsRole === "owner") {
    role = "store_customer";
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-4">
              <Package className="h-6 w-6 text-primary shrink-0" />
              <div className="group-data-[collapsible=icon]:hidden">
                <h2 className="text-lg font-semibold">Warehouse</h2>
                <p className="text-xs text-muted-foreground">WMS Portal</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <WMSNavigation userRole={role} />
          </SidebarContent>
          
          <SidebarFooter className="border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Go back</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
