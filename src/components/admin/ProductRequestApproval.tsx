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
  product_name: string;
  quantity: number;
  notes: string | null;
  status: string;
  image_urls: string[] | null;
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
      return data as ProductRequest[];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
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
              quantity: request.quantity,
              customer_id: request.customer_id,
            });
          if (invError) throw invError;
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
                  <span className="font-medium">{request.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
                {request.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="mt-1">{request.notes}</p>
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
                  <p className="font-medium">{selectedRequest.quantity}</p>
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
              {selectedRequest.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Customer Notes:</span>
                  <p className="mt-1 text-sm">{selectedRequest.notes}</p>
                </div>
              )}
              {selectedRequest.image_urls && selectedRequest.image_urls.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Images:</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedRequest.image_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                    ))}
                  </div>
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
