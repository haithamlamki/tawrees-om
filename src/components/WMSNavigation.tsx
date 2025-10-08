import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  ShoppingCart, 
  FileBarChart, 
  Building2, 
  FilePlus,
  Settings,
  Users,
  Truck,
  ClipboardCheck,
  Workflow,
  BarChart3,
  MapPin,
  DollarSign,
  TrendingUp,
  Store,
  FileCheck,
  Home,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from "@/components/ui/sidebar";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  group?: string;
}

const navigationItems: NavigationItem[] = [
  // ===== REGULAR USER / CUSTOMER PAGES =====
  {
    name: "Home",
    href: "/",
    icon: Home,
    roles: ["user", "store_customer", "branch_manager", "admin"],
    group: "Main"
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["user", "store_customer", "branch_manager", "admin"],
    group: "Main"
  },
  {
    name: "Locations",
    href: "/locations",
    icon: MapPin,
    roles: ["user", "store_customer", "branch_manager", "admin", "shipping_partner"],
    group: "Main"
  },
  {
    name: "Rates",
    href: "/rates",
    icon: DollarSign,
    roles: ["user", "store_customer", "branch_manager", "admin"],
    group: "Main"
  },
  
  // ===== WMS CUSTOMER PAGES =====
  {
    name: "WMS Dashboard",
    href: "/warehouse/dashboard",
    icon: LayoutDashboard,
    roles: ["store_customer", "branch_manager"],
    group: "WMS"
  },
  {
    name: "Contract",
    href: "/warehouse/contract",
    icon: FileText,
    roles: ["store_customer"],
    group: "WMS"
  },
  {
    name: "Inventory",
    href: "/warehouse/inventory",
    icon: Package,
    roles: ["store_customer", "branch_manager"],
    group: "WMS"
  },
  {
    name: "Orders",
    href: "/warehouse/orders",
    icon: ShoppingCart,
    roles: ["store_customer", "branch_manager"],
    group: "WMS"
  },
  {
    name: "Invoices",
    href: "/warehouse/invoices",
    icon: FileBarChart,
    roles: ["store_customer"],
    group: "WMS"
  },
  {
    name: "Reports",
    href: "/warehouse/reports",
    icon: BarChart3,
    roles: ["store_customer"],
    group: "WMS"
  },
  {
    name: "Branches",
    href: "/warehouse/branches",
    icon: Building2,
    roles: ["store_customer", "branch_manager"],
    group: "WMS"
  },
  {
    name: "Product Requests",
    href: "/warehouse/product-requests",
    icon: FilePlus,
    roles: ["store_customer", "branch_manager"],
    group: "WMS"
  },
  {
    name: "Settings",
    href: "/warehouse/settings",
    icon: Settings,
    roles: ["store_customer"],
    group: "WMS"
  },
  
  // ===== ADMIN PAGES =====
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
    group: "Admin"
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: TrendingUp,
    roles: ["admin"],
    group: "Admin"
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: Store,
    roles: ["admin"],
    group: "Admin"
  },
  {
    name: "Quote Management",
    href: "/admin/quotes",
    icon: FileCheck,
    roles: ["admin"],
    group: "Admin"
  },
  {
    name: "Product Approvals",
    href: "/admin/product-approvals",
    icon: FileCheck,
    roles: ["admin"],
    group: "Admin"
  },
  {
    name: "Admin Locations",
    href: "/admin/locations",
    icon: MapPin,
    roles: ["admin"],
    group: "Admin"
  },
  
  // ===== ADMIN WMS PAGES =====
  {
    name: "WMS Dashboard",
    href: "/admin/wms",
    icon: LayoutDashboard,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Customers",
    href: "/admin/wms-customers",
    icon: Users,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Customer Orders",
    href: "/admin/wms-customer-orders",
    icon: ShoppingCart,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Contracts",
    href: "/admin/wms-contracts",
    icon: FileText,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Inventory",
    href: "/admin/wms-inventory",
    icon: Package,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Orders",
    href: "/admin/wms-orders",
    icon: ShoppingCart,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Invoices",
    href: "/admin/wms-invoices",
    icon: FileBarChart,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Drivers",
    href: "/admin/wms-drivers",
    icon: Truck,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "Workflow Settings",
    href: "/admin/wms-workflow",
    icon: Workflow,
    roles: ["admin"],
    group: "Admin WMS"
  },
  {
    name: "MIS Report",
    href: "/admin/wms-mis-report",
    icon: ClipboardCheck,
    roles: ["admin"],
    group: "Admin WMS"
  },
  
  // ===== EMPLOYEE DASHBOARD =====
  {
    name: "Employee Dashboard",
    href: "/employee",
    icon: UserCog,
    roles: ["employee", "admin"],
    group: "Employee"
  },
  
  // ===== PARTNER DASHBOARD =====
  {
    name: "Partner Dashboard",
    href: "/partner",
    icon: Users,
    roles: ["shipping_partner", "admin"],
    group: "Partner"
  },
  {
    name: "Partner Locations",
    href: "/partner/locations",
    icon: MapPin,
    roles: ["shipping_partner", "admin"],
    group: "Partner"
  },
  
  // ===== FINANCE/ACCOUNTANT DASHBOARD =====
  {
    name: "Finance Dashboard",
    href: "/finance",
    icon: DollarSign,
    roles: ["accountant", "admin"],
    group: "Finance"
  },
];

interface WMSNavigationProps {
  userRole?: string;
}

export const WMSNavigation = ({ userRole }: WMSNavigationProps) => {
  const { t } = useTranslation();
  const location = useLocation();

  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(userRole || "")
  );

  // Group items by their group property
  const groupedItems = filteredItems.reduce((acc, item) => {
    const group = item.group || "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  return (
    <>
      {Object.entries(groupedItems).map(([groupName, items]) => (
        <SidebarGroup key={groupName}>
          <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.href}>
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
};
