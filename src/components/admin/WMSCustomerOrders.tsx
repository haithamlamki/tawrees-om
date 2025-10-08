import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function WMSCustomerOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-wms-orders", statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("wms_orders")
        .select(`
          *,
          customer:wms_customers(company_name, customer_code),
          branch:wms_customer_branches(branch_name, city),
          order_items:wms_order_items(
            id,
            quantity,
            unit_price,
            total_price,
            inventory:wms_inventory(product_name, sku, unit)
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.ilike("order_number", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approveOrderMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      const { error } = await supabase
        .from("wms_orders")
        .update({ status: "approved" })
        .eq("id", orderId);
      
      if (error) throw error;

      // Create approval record
      await supabase.from("wms_order_approvals").insert({
        order_id: orderId,
        status: "approved",
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wms-orders"] });
      setIsDrawerOpen(false);
      setApprovalNotes("");
      toast({ title: "Order approved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve order", description: error.message, variant: "destructive" });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      const { error } = await supabase
        .from("wms_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      
      if (error) throw error;

      await supabase.from("wms_order_approvals").insert({
        order_id: orderId,
        status: "rejected",
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wms-orders"] });
      setIsDrawerOpen(false);
      setApprovalNotes("");
      toast({ title: "Order rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to reject order", description: error.message, variant: "destructive" });
    },
  });

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "approved": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "in_progress": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "delivered": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "pending_approval": return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
      case "cancelled": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Orders</h1>
          <p className="text-muted-foreground">Manage and approve customer orders</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Orders</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading orders...</p>
          ) : !orders || orders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No orders found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer?.company_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer?.customer_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.branch ? `${order.branch.branch_name} (${order.branch.city})` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total_amount.toFixed(2)} OMR
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Order Details</SheetTitle>
                <SheetDescription>
                  Order #{selectedOrder.order_number}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedOrder.customer?.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                  </div>
                  {selectedOrder.branch && (
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Branch</p>
                      <p className="font-medium">{selectedOrder.branch.branch_name}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.inventory?.product_name}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.inventory?.sku}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} {item.inventory?.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.total_price.toFixed(2)} OMR</p>
                          <p className="text-sm text-muted-foreground">{item.unit_price.toFixed(2)} OMR each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">{selectedOrder.total_amount.toFixed(2)} OMR</span>
                </div>

                {selectedOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Order Notes</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedOrder.notes}</p>
                    </div>
                  </>
                )}

                {selectedOrder.status === "pending_approval" && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="approval-notes">Approval Notes</Label>
                        <Textarea
                          id="approval-notes"
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          placeholder="Add notes for approval or rejection..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => rejectOrderMutation.mutate({ orderId: selectedOrder.id, notes: approvalNotes })}
                          disabled={rejectOrderMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Order
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => approveOrderMutation.mutate({ orderId: selectedOrder.id, notes: approvalNotes })}
                          disabled={approveOrderMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Order
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
