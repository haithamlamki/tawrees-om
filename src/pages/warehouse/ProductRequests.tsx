import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, FilePlus, Eye, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WMSProductRequest } from "@/types/wms";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export default function WMSProductRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WMSProductRequest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    specifications: "",
    requested_quantity: 1,
    image_url: "",
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["wms-product-requests", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("wms_product_requests")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WMSProductRequest[];
    },
    enabled: !!customer?.id,
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("wms_product_requests").insert({
        ...data,
        customer_id: customer!.id,
        requested_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-product-requests"] });
      setOpen(false);
      resetForm();
      toast({ title: "Product request submitted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Maximum size is 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('wms-product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wms-product-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
    setImagePreview(null);
  };

  const resetForm = () => {
    setFormData({
      product_name: "",
      description: "",
      specifications: "",
      requested_quantity: 1,
      image_url: "",
    });
    setImagePreview(null);
  };

  const handleViewDetails = (request: WMSProductRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (customerLoading || requestsLoading) {
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
      case "approved": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "rejected": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default: return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Requests</h1>
          <p className="text-muted-foreground">Request new products for warehouse storage</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_name">Product Name *</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requested_quantity">Requested Quantity *</Label>
                <Input
                  id="requested_quantity"
                  type="number"
                  min="1"
                  value={formData.requested_quantity}
                  onChange={(e) => setFormData({ ...formData, requested_quantity: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specifications">Specifications</Label>
                <Textarea
                  id="specifications"
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  rows={3}
                  placeholder="Size, weight, special requirements, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Maximum size: 5MB</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || uploading}>
                  Submit Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <div className="text-center py-8">
              <FilePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No product requests yet. Submit your first request.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {request.image_url && (
                          <img src={request.image_url} alt={request.product_name} className="w-10 h-10 object-cover rounded" />
                        )}
                        {request.product_name}
                      </div>
                    </TableCell>
                    <TableCell>{request.requested_quantity}</TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(request)}>
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

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle>Request Details</SheetTitle>
                <SheetDescription>
                  Product request information
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selectedRequest.image_url && (
                  <div>
                    <img 
                      src={selectedRequest.image_url} 
                      alt={selectedRequest.product_name} 
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedRequest.product_name}</h3>
                  <Badge variant="outline" className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Quantity</p>
                    <p className="font-medium">{selectedRequest.requested_quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Date</p>
                    <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                  </div>
                  {selectedRequest.reviewed_at && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Reviewed Date</p>
                        <p className="font-medium">{new Date(selectedRequest.reviewed_at).toLocaleDateString()}</p>
                      </div>
                    </>
                  )}
                </div>

                {selectedRequest.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRequest.description}</p>
                    </div>
                  </>
                )}

                {selectedRequest.specifications && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Specifications</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRequest.specifications}</p>
                    </div>
                  </>
                )}

                {selectedRequest.reviewer_notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Reviewer Notes</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRequest.reviewer_notes}</p>
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
