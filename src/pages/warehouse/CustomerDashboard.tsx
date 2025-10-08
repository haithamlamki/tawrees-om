import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileBarChart, AlertCircle } from "lucide-react";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { WMSContract, WMSOrder, WMSInvoice } from "@/types/wms";

export default function CustomerDashboard() {
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();

  // Get contract
  const { data: contract } = useQuery({
    queryKey: ["wms-contract", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("wms_contracts")
        .select("*")
        .eq("customer_id", customer.id)
        .eq("status", "active")
        .single();
      return data as WMSContract;
    },
    enabled: !!customer?.id,
  });

  // Get inventory count
  const { data: inventoryCount } = useQuery({
    queryKey: ["wms-inventory-count", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return 0;
      const { count } = await supabase
        .from("wms_inventory")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customer.id);
      return count || 0;
    },
    enabled: !!customer?.id,
  });

  // Get active orders count
  const { data: activeOrdersCount } = useQuery({
    queryKey: ["wms-active-orders-count", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return 0;
      const { count } = await supabase
        .from("wms_orders")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customer.id)
        .in("status", ["pending", "pending_approval", "approved", "in_progress"]);
      return count || 0;
    },
    enabled: !!customer?.id,
  });

  // Get outstanding invoices total
  const { data: outstandingInvoices } = useQuery({
    queryKey: ["wms-outstanding-invoices", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return 0;
      const { data } = await supabase
        .from("wms_invoices")
        .select("total_amount")
        .eq("customer_id", customer.id)
        .eq("status", "pending");
      return data?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
    },
    enabled: !!customer?.id,
  });

  // Get recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ["wms-recent-orders", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data } = await supabase
        .from("wms_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data as WMSOrder[];
    },
    enabled: !!customer?.id,
  });

  if (customerLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not linked to any warehouse customer. Please contact an administrator.
        </AlertDescription>
      </Alert>
    );
  }

  const daysRemaining = contract
    ? Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Warehouse Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {customer.company_name}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products in Storage</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryCount}</div>
            <p className="text-xs text-muted-foreground">Total products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrdersCount}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contract ? `${outstandingInvoices?.toFixed(2)} OMR` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Pending payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contract Status</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contract?.status === "active" ? `${daysRemaining} days` : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">
              {contract?.status === "active" ? "Until expiry" : "No active contract"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Overview */}
      {contract && (
        <Card>
          <CardHeader>
            <CardTitle>Contract Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Contract Number</p>
                <p className="font-medium">{contract.contract_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Fee</p>
                <p className="font-medium">{contract.monthly_fee} OMR</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Storage Space</p>
                <p className="font-medium">{contract.storage_space_sqm} sqm</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Free Transfers</p>
                <p className="font-medium">{contract.free_transfer_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {recentOrders && recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{order.total_amount.toFixed(2)} OMR</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
