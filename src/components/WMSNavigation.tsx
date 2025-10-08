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
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from "@/components/ui/sidebar";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/warehouse/dashboard",
    icon: LayoutDashboard,
    roles: ["store_customer", "branch_manager", "admin"],
  },
  {
    name: "Contract",
    href: "/warehouse/contract",
    icon: FileText,
    roles: ["store_customer"],
  },
  {
    name: "Inventory",
    href: "/warehouse/inventory",
    icon: Package,
    roles: ["store_customer", "branch_manager"],
  },
  {
    name: "Orders",
    href: "/warehouse/orders",
    icon: ShoppingCart,
    roles: ["store_customer", "branch_manager"],
  },
  {
    name: "Invoices",
    href: "/warehouse/invoices",
    icon: FileBarChart,
    roles: ["store_customer"],
  },
  {
    name: "Reports",
    href: "/warehouse/reports",
    icon: BarChart3,
    roles: ["store_customer"],
  },
  {
    name: "Branches",
    href: "/warehouse/branches",
    icon: Building2,
    roles: ["store_customer", "branch_manager"],
  },
  {
    name: "Product Requests",
    href: "/warehouse/product-requests",
    icon: FilePlus,
    roles: ["store_customer", "branch_manager"],
  },
  {
    name: "Settings",
    href: "/warehouse/settings",
    icon: Settings,
    roles: ["store_customer"],
  },
  // Admin-only items
  {
    name: "WMS Customers",
    href: "/admin/wms-customers",
    icon: Users,
    roles: ["admin"],
  },
  {
    name: "WMS Contracts",
    href: "/admin/wms-contracts",
    icon: FileText,
    roles: ["admin"],
  },
  {
    name: "WMS Inventory",
    href: "/admin/wms-inventory",
    icon: Package,
    roles: ["admin"],
  },
  {
    name: "WMS Orders",
    href: "/admin/wms-orders",
    icon: ShoppingCart,
    roles: ["admin"],
  },
  {
    name: "WMS Invoices",
    href: "/admin/wms-invoices",
    icon: FileBarChart,
    roles: ["admin"],
  },
  {
    name: "Drivers",
    href: "/admin/wms-drivers",
    icon: Truck,
    roles: ["admin"],
  },
  {
    name: "Workflow Settings",
    href: "/admin/wms-workflow",
    icon: Workflow,
    roles: ["admin"],
  },
  {
    name: "MIS Report",
    href: "/admin/wms-mis-report",
    icon: ClipboardCheck,
    roles: ["admin"],
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

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredItems.map((item) => {
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
  );
};
