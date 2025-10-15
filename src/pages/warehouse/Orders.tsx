import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ShoppingCart, Plus, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WMSOrder, WMSInventory } from "@/types/wms";

export default function WMSOrders() {
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<Array<{ inventory_id: string; quantity: number; inventory?: WMSInventory }>>([]);
  const [orderNotes, setOrderNotes] = useState("");

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["wms-orders", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("wms_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WMSOrder[];
    },
    enabled: !!customer?.id,
  });

  const { data: inventory } = useQuery({
    queryKey: ["wms-inventory", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("wms_inventory")
        .select("*")
        .eq("customer_id", customer.id)
        .order("product_name");
      if (error) throw error;
      return data as WMSInventory[];
    },
    enabled: !!customer?.id && orderDialogOpen,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: {
      items: Array<{ inventory_id: string; quantity: number }>;
      notes: string;
    }) => {
      if (!customer?.id) throw new Error("No customer");
      
      // Calculate total
      const total = data.items.reduce((sum, item) => {
        const inv = inventory?.find((i) => i.id === item.inventory_id);
        return sum + (inv?.price_per_unit || 0) * item.quantity;
      }, 0);

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("wms_orders")
        .insert({
          customer_id: customer.id,
          order_number: orderNumber,
          status: "pending_approval",
          total_amount: total,
          notes: data.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = data.items.map((item) => {
        const inv = inventory?.find((i) => i.id === item.inventory_id);
        const unitPrice = inv?.price_per_unit || 0;
        return {
          order_id: order.id,
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * item.quantity,
          customer_id: customer.id, // Materialized customer_id for efficient RLS
        };
      });

      const { error: itemsError } = await supabase
        .from("wms_order_items")
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-orders"] });
      toast({ title: "Order created successfully" });
      setOrderDialogOpen(false);
      setOrderItems([]);
      setOrderNotes("");
    },
    onError: () => {
      toast({ title: "Failed to create order", variant: "destructive" });
    },
  });

  const addOrderItem = (inventoryId: string) => {
    const inv = inventory?.find((i) => i.id === inventoryId);
    if (!inv) return;
    
    setOrderItems([...orderItems, { inventory_id: inventoryId, quantity: 1, inventory: inv }]);
  };

  const updateOrderItemQuantity = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    setOrderItems(newItems);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = () => {
    if (orderItems.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    createOrderMutation.mutate({
      items: orderItems,
      notes: orderNotes,
    });
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      return sum + (item.inventory?.price_per_unit || 0) * item.quantity;
    }, 0);
  };

  if (customerLoading || ordersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not linked to any warehouse customer.
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "delivered": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-purple-100 text-purple-800";
      case "pending_approval": return "bg-orange-100 text-orange-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const pendingCount = orders?.filter((o) => o.status === "pending" || o.status === "pending_approval").length || 0;
  const activeCount = orders?.filter((o) => o.status === "approved" || o.status === "in_progress").length || 0;
  const completedCount = orders?.filter((o) => o.status === "completed" || o.status === "delivered").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage warehouse orders</p>
        </div>
        <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Select items from your inventory to create an order
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Add Items</Label>
                <Select onValueChange={addOrderItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory?.filter((inv) => inv.status !== "out_of_stock").map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.product_name} ({inv.sku}) - Available: {inv.quantity} {inv.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {orderItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Order Items</Label>
                  <div className="border rounded-lg p-4 space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.inventory?.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.inventory?.sku} • {item.inventory?.price_per_unit} OMR/{item.inventory?.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={item.inventory?.quantity}
                            value={item.quantity}
                            onChange={(e) => updateOrderItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                          <span className="text-sm whitespace-nowrap">
                            {((item.inventory?.price_per_unit || 0) * item.quantity).toFixed(2)} OMR
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOrderItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="text-lg font-bold">{calculateTotal().toFixed(2)} OMR</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any special instructions or notes..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOrder} disabled={createOrderMutation.isPending || orderItems.length === 0}>
                  {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <ShoppingCart className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders yet. Create your first order.</p>
              <Button className="mt-4" onClick={() => setOrderDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.total_amount.toFixed(2)} OMR</TableCell>
                    <TableCell className="max-w-xs truncate">{order.notes || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
