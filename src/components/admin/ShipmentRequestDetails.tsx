import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, User, Mail, Phone, FileText } from "lucide-react";
import { ItemDetailsViewer } from "./ItemDetailsViewer";
import { toast } from "sonner";

interface ShipmentRequestDetailsProps {
  requestId: string;
  compact?: boolean;
}

interface RequestData {
  id: string;
  customer_id: string;
  shipping_type: string;
  calculation_method?: string;
  calculated_cost: number;
  status: string;
  created_at: string;
  items?: any;
  cbm_volume?: number;
  weight_kg?: number;
  delivery_type?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_country?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  notes?: string;
  container_type_id?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  container_types?: {
    name: string;
  };
}

export function ShipmentRequestDetails({ requestId, compact = false }: ShipmentRequestDetailsProps) {
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("shipment_requests")
        .select(`
          *,
          profiles (
            full_name,
            email,
            phone
          ),
          container_types (
            name
          )
        `)
        .eq("id", requestId)
        .single();

      if (error) throw error;

      setRequest(data);
    } catch (error: any) {
      console.error("Error loading request details:", error);
      toast.error("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Request not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Request Details with Customer Info */}
      {!compact && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Request Details
              </CardTitle>
              <Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "outline"}>
                {request.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Request ID</p>
                <p className="font-mono font-semibold">{request.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Date</p>
                <p className="font-medium">{new Date(request.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Shipping Type</p>
                <p className="font-medium uppercase">{request.shipping_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Method</p>
                <p className="font-medium uppercase">{request.calculation_method || "N/A"}</p>
              </div>
            </div>

            {/* Customer Information */}
            {request.profiles && (
              <>
                <Separator />
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h3>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.profiles.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{request.profiles.email}</span>
                    </div>
                    {request.profiles.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{request.profiles.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items Breakdown with Cost Summary */}
      {request.items && Array.isArray(request.items) && request.items.length > 0 && (
        <ItemDetailsViewer
          items={request.items}
          shippingType={request.shipping_type as "air" | "sea"}
          calculationMethod={request.calculation_method as "cbm" | "container"}
          containerType={request.container_types?.name}
          totalCBM={request.cbm_volume}
          totalWeight={request.weight_kg}
          compact={compact}
          requestId={request.id}
          onItemUpdate={loadRequestDetails}
          calculatedCost={request.calculated_cost}
        />
      )}

      {/* Notes */}
      {request.notes && !compact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4" />
              Special Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
