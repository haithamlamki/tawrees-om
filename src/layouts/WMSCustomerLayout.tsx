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

  // Check if user has store_customer role
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
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

  // Redirect if user doesn't have store_customer role
  if (!userRoles?.includes("store_customer") && !userRoles?.includes("branch_manager") && !userRoles?.includes("admin")) {
    return <Navigate to="/" replace />;
  }

  // Determine user role with priority order
  const role = userRoles?.includes("admin")
    ? "admin"
    : userRoles?.includes("employee")
    ? "employee"
    : userRoles?.includes("shipping_partner")
    ? "shipping_partner"
    : userRoles?.includes("accountant")
    ? "accountant"
    : userRoles?.includes("branch_manager")
    ? "branch_manager"
    : userRoles?.includes("store_customer")
    ? "store_customer"
    : "user";

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
