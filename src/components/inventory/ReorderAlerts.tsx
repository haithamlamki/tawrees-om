import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReorderAlertsProps {
  customerId: string;
}

export const ReorderAlerts = ({ customerId }: ReorderAlertsProps) => {
  const queryClient = useQueryClient();
  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['low-stock-items', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_inventory')
        .select('*')
        .eq('customer_id', customerId)
        .lte('quantity', 10)
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleReorder = async (item: any) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('wms_orders' as any)
        .insert({
          customer_id: customerId,
          status: 'draft',
          order_type: 'reorder',
          notes: `Reorder for ${item.product_name} - Low stock alert`,
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemError } = await supabase
        .from('wms_order_items' as any)
        .insert({
          order_id: (orderData as any)?.id,
          inventory_id: item.id,
          quantity: item.reorder_point || 20,
          unit_price: 0,
        } as any);

      if (itemError) throw itemError;

      toast.success(`Reorder created for ${item.product_name}`);
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
    } catch (error: any) {
      console.error("Reorder error:", error);
      toast.error(error.message || "Failed to create reorder");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading alerts...</div>;
  }

  if (!lowStockItems || lowStockItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-green-500" />
            Stock Levels Healthy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All inventory items are above minimum stock levels
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Low Stock Alerts ({lowStockItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.product_name}</p>
                  <Badge 
                    variant={item.quantity === 0 ? "destructive" : "secondary"}
                  >
                    {item.quantity} {item.unit}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  SKU: {item.sku} • {(item as any).location || "No location"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReorder(item)}
              >
                Reorder
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
