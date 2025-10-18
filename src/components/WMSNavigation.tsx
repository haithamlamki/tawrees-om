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
  UserCog,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton 
} from "@/components/ui/sidebar";

interface NavigationSubItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  group?: string;
  subItems?: NavigationSubItem[];
}

const navigationItems: NavigationItem[] = [
  // ===== REGULAR USER / CUSTOMER PAGES =====
  {
    name: "Home",
    href: "/",
    icon: Home,
    roles: ["user", "store_customer", "branch_manager", "admin", "shipping_partner"],
    group: "Main"
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["user", "store_customer", "branch_manager", "admin", "shipping_partner"],
    group: "Main",
    subItems: [
      { name: "Shipment Requests", href: "/dashboard#requests", icon: Package },
      { name: "Profile", href: "/dashboard#profile", icon: Users },
      { name: "Notifications", href: "/dashboard#notifications", icon: MessageSquare },
      { name: "My Quotes", href: "/dashboard#quotes", icon: FileCheck },
    ],
  },
  {
    name: "Locations",
    href: "/locations",
    icon: MapPin,
    roles: ["admin", "employee", "accountant", "branch_manager"],
    group: "Main"
  },
  {
    name: "Rates",
    href: "/rates",
    icon: DollarSign,
    roles: ["admin", "employee", "accountant", "branch_manager"],
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
    name: "Employee Dashboard",
    href: "/warehouse/employee-dashboard",
    icon: UserCog,
    roles: ["wms_employee"],
    group: "WMS"
  },
  {
    name: "Accountant Dashboard",
    href: "/warehouse/accountant-dashboard",
    icon: FileBarChart,
    roles: ["wms_accountant"],
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
    roles: ["store_customer", "branch_manager", "wms_employee"],
    group: "WMS"
  },
  {
    name: "Orders",
    href: "/warehouse/orders",
    icon: ShoppingCart,
    roles: ["store_customer", "branch_manager", "wms_employee"],
    group: "WMS"
  },
  {
    name: "Invoices",
    href: "/warehouse/invoices",
    icon: FileBarChart,
    roles: ["store_customer", "wms_accountant"],
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
    name: "Users",
    href: "/warehouse/users",
    icon: Users,
    roles: ["store_customer"],
    group: "WMS Management"
  },
  {
    name: "Workflow Settings",
    href: "/warehouse/workflow-settings",
    icon: Workflow,
    roles: ["store_customer"],
    group: "WMS Management"
  },
  {
    name: "Settings",
    href: "/warehouse/settings",
    icon: Settings,
    roles: ["store_customer"],
    group: "WMS Management"
  },
  
  // ===== ADMIN PAGES =====
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
    group: "Admin",
    subItems: [
      { name: "Overview", href: "/admin#dashboard", icon: LayoutDashboard },
      { name: "Requests", href: "/admin#requests", icon: Package },
      { name: "Shipments", href: "/admin#shipments", icon: ShoppingCart },
      { name: "Customers", href: "/admin#customers", icon: Users },
      { name: "User Roles", href: "/admin#users", icon: UserCog },
      { name: "Partners", href: "/admin#partners", icon: Building2 },
      { name: "Surcharges", href: "/admin#surcharges", icon: DollarSign },
      { name: "Delivery", href: "/admin#delivery", icon: Truck },
      { name: "Audit Logs", href: "/admin#audit", icon: FileText },
      { name: "Rates", href: "/admin#rates", icon: DollarSign },
      { name: "History", href: "/admin#history", icon: FileText },
      { name: "Quality Check", href: "/admin#qc", icon: ClipboardCheck },
      { name: "Bulk Operations", href: "/admin#bulk", icon: Workflow },
      { name: "Invoices", href: "/admin#invoices", icon: FileBarChart },
    ],
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
    name: "User Management",
    href: "/admin/wms-users",
    icon: UserCog,
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
  {
    name: "Support Messages",
    href: "/admin/wms-support",
    icon: MessageSquare,
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
    group: "Partner",
    subItems: [
      { name: "New Requests", href: "/partner#requests", icon: Package },
      { name: "Active Shipments", href: "/partner#shipments", icon: Truck },
      { name: "Invoices", href: "/partner#invoices", icon: FileText },
    ],
  },
  {
    name: "Partner Locations",
    href: "/partner/locations",
    icon: MapPin,
    roles: ["shipping_partner", "admin"],
    group: "Partner"
  },
  {
    name: "Rates",
    href: "/rates",
    icon: DollarSign,
    roles: ["shipping_partner", "admin"],
    group: "Partner"
  },
  
  // ===== FINANCE/ACCOUNTANT DASHBOARD =====
  {
    name: "Finance Dashboard",
    href: "/finance",
    icon: DollarSign,
    roles: ["accountant", "admin"],
    group: "Finance",
    subItems: [
      { name: "Overview", href: "/finance#dashboard", icon: LayoutDashboard },
      { name: "Revenue", href: "/finance#revenue", icon: TrendingUp },
      { name: "Payments", href: "/finance#payments", icon: DollarSign },
      { name: "Invoices", href: "/finance#invoices", icon: FileBarChart },
      { name: "Reports", href: "/finance#reports", icon: BarChart3 },
    ],
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
                const hasSub = item.subItems && item.subItems.length > 0;

                const isActivePath = (path: string) => {
                  if (path === "/") return location.pathname === "/";
                  if (path.includes("#")) {
                    const [pathname, hash] = path.split("#");
                    return location.pathname === pathname && location.hash === `#${hash}`;
                  }
                  return location.pathname === path || location.pathname.startsWith(path + "/");
                };

                return (
                  <>
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActivePath(item.href)}>
                        <Link to={item.href}>
                          <Icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {hasSub && (
                      item.subItems!.map((sub) => (
                        <SidebarMenuItem key={`${item.name}-${sub.name}`}>
                          <SidebarMenuButton asChild isActive={isActivePath(sub.href)} className="pl-8 text-sm">
                            <Link to={sub.href}>
                              {sub.icon && <sub.icon className="h-4 w-4" />}
                              <span>{sub.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
};
