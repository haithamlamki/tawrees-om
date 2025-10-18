import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Ship,
  BarChart3,
  Settings,
  LogOut,
  Calculator,
  MapPin,
  DollarSign,
  Truck,
  ShoppingCart,
  Building2,
  FilePlus,
  Workflow,
  UserCog,
  FileBarChart,
  Home,
  ClipboardCheck,
  MessageSquare,
  TrendingUp,
  Store,
  FileCheck,
  Bell,
  User,
  CheckSquare,
  Download,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import logo from "@/assets/tawreed-logo.png";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const adminNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, group: "Main" },
  { name: "Analytics", href: "/admin/analytics", icon: TrendingUp, group: "Main" },
  { name: "Products", href: "/admin/products", icon: Store, group: "Products" },
  { name: "Add Product", href: "/admin/products/new", icon: FilePlus, group: "Products" },
  { name: "Alibaba Import", href: "/admin/products/import/alibaba", icon: Download, group: "Products" },
  { name: "Quote Management", href: "/admin/quotes", icon: FileCheck, group: "Products" },
  { name: "Product Approvals", href: "/admin/product-approvals", icon: CheckSquare, group: "Products" },
  { name: "Locations", href: "/locations", icon: MapPin, group: "Shipping" },
  { name: "Rates", href: "/rates", icon: DollarSign, group: "Shipping" },
  { name: "WMS Dashboard", href: "/admin/wms", icon: LayoutDashboard, group: "WMS" },
  { name: "WMS Customers", href: "/admin/wms-customers", icon: Users, group: "WMS" },
  { name: "WMS Users", href: "/admin/wms-users", icon: UserCog, group: "WMS" },
  { name: "WMS Contracts", href: "/admin/wms-contracts", icon: FileText, group: "WMS" },
  { name: "WMS Inventory", href: "/admin/wms-inventory", icon: Package, group: "WMS" },
  { name: "WMS Orders", href: "/admin/wms-orders", icon: ShoppingCart, group: "WMS" },
  { name: "Customer Orders", href: "/admin/wms-customer-orders", icon: ShoppingBag, group: "WMS" },
  { name: "WMS Invoices", href: "/admin/wms-invoices", icon: FileBarChart, group: "WMS" },
  { name: "WMS Drivers", href: "/admin/wms-drivers", icon: Truck, group: "WMS" },
  { name: "WMS Workflow", href: "/admin/wms-workflow", icon: Workflow, group: "WMS" },
  { name: "MIS Report", href: "/admin/wms-mis-report", icon: ClipboardCheck, group: "WMS" },
  { name: "Support", href: "/admin/wms-support", icon: MessageSquare, group: "WMS" },
];

const customerNavigation: NavigationItem[] = [
  { name: "Home", href: "/", icon: Home, group: "Main" },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Main" },
  { name: "Calculator", href: "/", icon: Calculator, group: "Tools" },
  { name: "Track Shipment", href: "/tracking", icon: Ship, group: "Tools" },
];

const employeeNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard, group: "Main" },
  { name: "Locations", href: "/locations", icon: MapPin, group: "Tools" },
  { name: "Rates", href: "/rates", icon: DollarSign, group: "Tools" },
];

const partnerNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/partner", icon: Truck, group: "Main" },
  { name: "Locations", href: "/locations", icon: MapPin, group: "Tools" },
  { name: "Rates", href: "/rates", icon: DollarSign, group: "Tools" },
];

const accountantNavigation: NavigationItem[] = [
  { name: "Finance Dashboard", href: "/finance", icon: DollarSign, group: "Main" },
  { name: "Locations", href: "/locations", icon: MapPin, group: "Tools" },
  { name: "Rates", href: "/rates", icon: DollarSign, group: "Tools" },
];

const wmsCustomerNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/warehouse/dashboard", icon: LayoutDashboard, group: "Main" },
  { name: "Contract", href: "/warehouse/contract", icon: FileText, group: "Main" },
  { name: "Inventory", href: "/warehouse/inventory", icon: Package, group: "Operations" },
  { name: "Orders", href: "/warehouse/orders", icon: ShoppingCart, group: "Operations" },
  { name: "Product Requests", href: "/warehouse/product-requests", icon: FilePlus, group: "Operations" },
  { name: "Invoices", href: "/warehouse/invoices", icon: FileBarChart, group: "Financial" },
  { name: "Reports", href: "/warehouse/reports", icon: BarChart3, group: "Financial" },
  { name: "Branches", href: "/warehouse/branches", icon: Building2, group: "Management" },
  { name: "Users", href: "/warehouse/users", icon: Users, group: "Management" },
  { name: "Workflow Settings", href: "/warehouse/workflow-settings", icon: Workflow, group: "Settings" },
  { name: "Settings", href: "/warehouse/settings", icon: Settings, group: "Settings" },
];

const wmsEmployeeNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/warehouse/employee-dashboard", icon: UserCog, group: "Main" },
  { name: "Inventory", href: "/warehouse/inventory", icon: Package, group: "Operations" },
  { name: "Orders", href: "/warehouse/orders", icon: ShoppingCart, group: "Operations" },
  { name: "Product Requests", href: "/warehouse/product-requests", icon: FilePlus, group: "Operations" },
];

const wmsAccountantNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/warehouse/accountant-dashboard", icon: FileBarChart, group: "Main" },
  { name: "Invoices", href: "/warehouse/invoices", icon: FileBarChart, group: "Financial" },
  { name: "Reports", href: "/warehouse/reports", icon: BarChart3, group: "Financial" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Load roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const rolesList = roles?.map(r => r.role) || [];
    setUserRoles(rolesList);

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email, wms_customer_id')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (profileData) {
      setProfile({ full_name: profileData.full_name, email: profileData.email });

      // Determine navigation based on roles
      let nav: NavigationItem[] = [];
      
      if (rolesList.includes("admin")) {
        nav = adminNavigation;
      } else if (profileData.wms_customer_id) {
        // WMS user - check specific WMS role
        const { data: wmsRole } = await supabase
          .from("wms_customer_users")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("customer_id", profileData.wms_customer_id)
          .maybeSingle();

        if (wmsRole?.role === "owner" || wmsRole?.role === "admin") {
          nav = wmsCustomerNavigation;
        } else if (wmsRole?.role === "employee") {
          nav = wmsEmployeeNavigation;
        } else if (wmsRole?.role === "accountant") {
          nav = wmsAccountantNavigation;
        }
      } else if (rolesList.includes("accountant")) {
        nav = accountantNavigation;
      } else if (rolesList.includes("shipping_partner")) {
        nav = partnerNavigation;
      } else if (rolesList.includes("employee")) {
        nav = employeeNavigation;
      } else if (rolesList.includes("customer")) {
        nav = customerNavigation;
      }

      setNavigationItems(nav);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  // Group items
  const groupedItems = navigationItems.reduce((acc, item) => {
    const group = item.group || "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-16" : "w-64"}>
      <SidebarHeader className="border-b p-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Tawreed" className="h-8 w-8 flex-shrink-0" />
          {!collapsed && <span className="text-xl font-bold text-primary">Tawreed</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            {!collapsed && <SidebarGroupLabel>{groupName}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link to={item.href} className="flex items-center gap-2">
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {!collapsed && <span>{item.name}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {profile && !collapsed && (
          <div className="flex items-center gap-2 mb-3 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {(profile.full_name || 'U')
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile.full_name || 'User'}</div>
              {profile.email && (
                <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
              )}
            </div>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
