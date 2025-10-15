import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Eye, CheckCircle, XCircle, Truck, Package, CheckCircle2, Loader2, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WMSOrder, WMSCustomer } from "@/types/wms";

export default function AdminWMSOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryBranch, setDeliveryBranch] = useState<string>("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-wms-orders", selectedCustomer, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("wms_orders")
        .select(`
          *,
          customer:wms_customers(company_name, customer_code),
          items:wms_order_items(
            id,
            inventory_id,
            quantity,
            unit_price,
            total_price,
            inventory:wms_inventory(product_name, sku, unit)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (selectedCustomer && selectedCustomer !== "all") {
        query = query.eq("customer_id", selectedCustomer);
      }
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["wms-customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customers")
        .select("id, company_name, customer_code")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data as WMSCustomer[];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["wms-branches-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customer_branches")
        .select("id, branch_name, customer_id")
        .order("branch_name");
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      deliveryNotes, 
      deliveryBranchId 
    }: { 
      id: string; 
      status: string; 
      deliveryNotes?: string;
      deliveryBranchId?: string;
    }) => {
      const updateData: any = { status };
      
      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
        if (deliveryNotes) updateData.delivery_notes = deliveryNotes;
        if (deliveryBranchId) updateData.delivery_branch_id = deliveryBranchId;
      }

      const { error } = await supabase
        .from("wms_orders")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-wms-orders"] });
      const statusMessages: Record<string, string> = {
        approved: "Order approved successfully and inventory deducted",
        cancelled: "Order cancelled",
        in_progress: "Order marked as in progress",
        delivered: "Order marked as delivered",
        completed: "Order completed successfully"
      };
      toast({ title: statusMessages[variables.status] || "Order status updated successfully" });
      
      // Reset delivery dialog state
      setDeliveryDialogOpen(false);
      setDeliveryNotes("");
      setDeliveryBranch("");
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      console.error("Error updating order status:", error);
      toast({ 
        title: "Failed to update order status", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const handleDeliveredClick = (order: any) => {
    setSelectedOrder(order);
    setDeliveryDialogOpen(true);
  };

  const handleDeliverySubmit = () => {
    if (!selectedOrder) return;
    
    updateStatusMutation.mutate({
      id: selectedOrder.id,
      status: "delivered",
      deliveryNotes,
      deliveryBranchId: deliveryBranch || undefined,
    });
  };

  const filteredOrders = orders?.filter((order: any) =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const totalOrders = orders?.length || 0;
  const pendingApproval = orders?.filter((o: any) => o.status === "pending_approval").length || 0;
  const inProgress = orders?.filter((o: any) => o.status === "in_progress" || o.status === "approved").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WMS Orders</h1>
        <p className="text-muted-foreground">Manage all warehouse orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingApproval}</div>
            <p className="text-xs text-muted-foreground">Requires action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers?.filter((c) => !!c.id).map((customer) => (
              <SelectItem key={customer.id} value={customer.id!}>
                {customer.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.customer?.company_name}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ")}
                        </Badge>
                        {order.status === "delivered" && !order.delivery_confirmed_by_customer && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Awaiting Customer
                          </Badge>
                        )}
                        {order.status === "completed" && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <FileText className="w-3 h-3 mr-1" />
                            Invoice Generated
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.total_amount.toFixed(2)} OMR</TableCell>
                    <TableCell className="max-w-xs truncate">{order.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setViewDialogOpen(true);
                          }}
                          title="View order details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {order.status === "pending_approval" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: order.id, status: "approved" })
                              }
                              disabled={updateStatusMutation.isPending}
                              title="Approve order and deduct inventory"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: order.id, status: "cancelled" })
                              }
                              disabled={updateStatusMutation.isPending}
                              title="Cancel order"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {order.status === "approved" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: "in_progress" })}
                            disabled={updateStatusMutation.isPending}
                            title="Mark as in progress"
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Truck className="h-4 w-4 mr-1" />
                                In Progress
                              </>
                            )}
                          </Button>
                        )}

                        {order.status === "in_progress" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDeliveredClick(order)}
                            disabled={updateStatusMutation.isPending}
                            title="Mark as delivered"
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Package className="h-4 w-4 mr-1" />
                                Delivered
                              </>
                            )}
                          </Button>
                        )}

                        {order.status === "delivered" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: "completed" })}
                            disabled={updateStatusMutation.isPending}
                            title="Mark as completed"
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Complete
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Number</p>
                  <p className="text-base font-semibold">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.replace("_", " ")}
                    </Badge>
                    {selectedOrder.status === "delivered" && !selectedOrder.delivery_confirmed_by_customer && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600 w-fit">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Awaiting Customer Confirmation
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="text-base">{selectedOrder.customer?.company_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                  <p className="text-base">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-base font-semibold">{selectedOrder.total_amount.toFixed(3)} OMR</p>
                </div>
                {selectedOrder.delivery_branch_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivery Branch</p>
                    <p className="text-base">{selectedOrder.delivery_branch_id}</p>
                  </div>
                )}
              </div>
              
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-base">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.delivery_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Notes</p>
                  <p className="text-base">{selectedOrder.delivery_notes}</p>
                </div>
              )}

              {selectedOrder.delivery_confirmed_by_customer && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-800">Delivery Confirmed by Customer</p>
                  </div>
                  <div className="text-sm text-green-700">
                    Confirmed at: {new Date(selectedOrder.customer_confirmed_at!).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Invoice has been generated automatically</span>
                  </div>
                </div>
              )}

              {selectedOrder.delivered_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivered At</p>
                  <p className="text-base">{new Date(selectedOrder.delivered_at).toLocaleString()}</p>
                </div>
              )}

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.inventory?.product_name || "N/A"}
                            </TableCell>
                            <TableCell>{item.inventory?.sku || "N/A"}</TableCell>
                            <TableCell>{item.inventory?.unit || "N/A"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.unit_price.toFixed(3)} OMR
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.total_price.toFixed(3)} OMR
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={5} className="text-right font-semibold">
                            Total Amount:
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {selectedOrder.total_amount.toFixed(3)} OMR
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Order as Delivered</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-notes">Delivery Notes</Label>
              <Textarea
                id="delivery-notes"
                placeholder="Enter delivery notes (optional)"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-branch">Delivery Branch (Optional)</Label>
              <Select value={deliveryBranch} onValueChange={setDeliveryBranch}>
                <SelectTrigger id="delivery-branch">
                  <SelectValue placeholder="Select branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Delivered timestamp will be automatically set to current time.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeliverySubmit} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Mark as Delivered"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
