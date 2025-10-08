import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";

interface ProductRequest {
  id: string;
  customer_id: string;
  requested_by: string;
  product_name: string;
  description: string | null;
  specifications: string | null;
  requested_quantity: number;
  image_url: string | null;
  status: string;
  reviewer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  customer: {
    company_name: string;
    full_name: string;
  };
}

const ProductRequestApproval = () => {
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-product-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_product_requests")
        .select(`
          *,
          customer:wms_customers!wms_product_requests_customer_id_fkey(company_name, full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, notes, customerId }: { id: string; status: string; notes: string; customerId: string }) => {
      const { error } = await supabase
        .from("wms_product_requests")
        .update({ status, admin_notes: notes })
        .eq("id", id);

      if (error) throw error;

      // If approved, create inventory item
      if (status === "approved") {
        const request = requests?.find(r => r.id === id);
        if (request) {
          const { error: invError } = await supabase
            .from("wms_inventory")
            .insert({
              product_name: request.product_name,
              description: request.description,
              quantity: request.requested_quantity,
              minimum_quantity: 0,
            } as any);
          if (invError) {
            console.error("Error creating inventory:", invError);
            throw invError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-requests"] });
      toast.success("Product request updated successfully");
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product request");
    },
  });

  const handleAction = (type: "approve" | "reject") => {
    if (!selectedRequest) return;
    setActionType(type);
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;
    const status = actionType === "approve" ? "approved" : "rejected";
    updateRequestMutation.mutate({
      id: selectedRequest.id,
      status,
      notes: adminNotes,
      customerId: selectedRequest.customer_id,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-600 border-green-500/30";
      case "rejected": return "bg-red-500/20 text-red-600 border-red-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      default: return "bg-secondary";
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading product requests...</div>;
  }

  return (
    <>
      <div className="grid gap-4">
        {requests?.map((request) => (
          <Card key={request.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">{request.product_name}</CardTitle>
              <Badge variant="outline" className={getStatusColor(request.status)}>
                {request.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{request.customer.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{request.requested_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
                {request.description && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="mt-1">{request.description}</p>
                  </div>
                )}
                {request.status === "pending" && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Product Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Product Name:</span>
                  <p className="font-medium">{selectedRequest.product_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <p className="font-medium">{selectedRequest.requested_quantity}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Customer:</span>
                  <p className="font-medium">{selectedRequest.customer.company_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>
              {selectedRequest.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="mt-1 text-sm">{selectedRequest.description}</p>
                </div>
              )}
              {selectedRequest.specifications && (
                <div>
                  <span className="text-sm text-muted-foreground">Specifications:</span>
                  <p className="mt-1 text-sm">{selectedRequest.specifications}</p>
                </div>
              )}
              {selectedRequest.image_url && (
                <div>
                  <span className="text-sm text-muted-foreground">Image:</span>
                  <img
                    src={selectedRequest.image_url}
                    alt="Product"
                    className="w-full max-w-md h-64 object-cover rounded mt-2"
                  />
                </div>
              )}
              {!actionType && selectedRequest.status === "pending" && (
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="default"
                    onClick={() => handleAction("approve")}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction("reject")}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
              {actionType && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this decision..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setActionType(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmAction}
                      disabled={updateRequestMutation.isPending}
                      variant={actionType === "approve" ? "default" : "destructive"}
                    >
                      {updateRequestMutation.isPending ? (
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                      ) : actionType === "approve" ? (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Confirm {actionType === "approve" ? "Approval" : "Rejection"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductRequestApproval;
