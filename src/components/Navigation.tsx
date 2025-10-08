import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Ship, User, LogOut, LayoutDashboard, Package, Truck, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import logo from "@/assets/tawreed-logo.png";

interface NavigationProps {
  isAuthenticated: boolean;
}

const Navigation = ({ isAuthenticated }: NavigationProps) => {
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserRoles();
    }
  }, [isAuthenticated]);

  const loadUserRoles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      setUserRoles(data?.map(r => r.role) || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="Tawreed" className="h-10 w-auto" />
            <span className="text-xl font-bold text-primary">Tawreed</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {userRoles.includes("customer") && (
                  <Button variant="ghost" asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                )}
                {userRoles.includes("admin") && (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link to="/locations">Locations</Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link to="/rates">Rates</Link>
                    </Button>
                  </>
                )}
                {userRoles.includes("employee") && (
                  <Button variant="ghost" asChild>
                    <Link to="/employee">
                      <Package className="mr-2 h-4 w-4" />
                      Employee
                    </Link>
                  </Button>
                )}
                {userRoles.includes("shipping_partner") && (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/partner">
                        <Truck className="mr-2 h-4 w-4" />
                        Partner
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link to="/locations">Locations</Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link to="/rates">Rates</Link>
                    </Button>
                  </>
                )}
                {userRoles.includes("accountant") && (
                  <Button variant="ghost" asChild>
                    <Link to="/finance">
                      <Calculator className="mr-2 h-4 w-4" />
                      Finance
                    </Link>
                  </Button>
                )}
                <NotificationBell />
                <LanguageSelector />
                <ThemeToggle />
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <LanguageSelector />
                <Button variant="ghost" asChild>
                  <Link to="/">Calculator</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
