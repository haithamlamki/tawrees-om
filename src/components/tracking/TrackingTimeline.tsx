import { Package, MapPin, CheckCircle, Clock, Truck, Building2, ExternalLink, Phone } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StatusHistoryItem {
  id: string;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  shipment_id?: string;
}

interface TrackingTimelineProps {
  statusHistory: StatusHistoryItem[];
}

const TrackingTimeline = ({ statusHistory }: TrackingTimelineProps) => {
  const [statusDetails, setStatusDetails] = useState<Record<string, any>>({});
  const [statusPhotos, setStatusPhotos] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchStatusDetails = async () => {
      if (statusHistory.length === 0) return;

      const shipmentId = statusHistory[0]?.shipment_id;
      if (!shipmentId) return;

      // Fetch shipment details (container, driver)
      const { data: shipment } = await supabase
        .from("shipments")
        .select(`
          id,
          container_number,
          container_tracking_url,
          assigned_driver_id,
          wms_drivers (
            name,
            phone,
            vehicle_type,
            vehicle_number
          )
        `)
        .eq("id", shipmentId)
        .single();

      if (shipment) {
        setStatusDetails(shipment);
      }

      // Fetch status photos
      const { data: photos } = await supabase
        .from("shipment_documents")
        .select("*")
        .eq("document_type", "status_photo");

      if (photos) {
        const photosByStatus: Record<string, any[]> = {};
        for (const photo of photos) {
          const status = statusHistory.find((s) => 
            new Date(s.created_at).getTime() <= new Date(photo.created_at).getTime()
          )?.status || "unknown";
          if (!photosByStatus[status]) {
            photosByStatus[status] = [];
          }
          photosByStatus[status].push(photo);
        }
        setStatusPhotos(photosByStatus);
      }
    };

    fetchStatusDetails();
  }, [statusHistory]);

  const getStatusIcon = (status: string, isLatest: boolean) => {
    const iconClass = isLatest ? "text-primary" : "text-muted-foreground";
    
    switch (status.toLowerCase()) {
      case "received_from_supplier":
        return <Package className={`h-5 w-5 ${iconClass}`} />;
      case "processing":
        return <Clock className={`h-5 w-5 ${iconClass}`} />;
      case "in_transit":
        return <Truck className={`h-5 w-5 ${iconClass}`} />;
      case "customs":
        return <Building2 className={`h-5 w-5 ${iconClass}`} />;
      case "received_muscat_wh":
        return <Building2 className={`h-5 w-5 ${iconClass}`} />;
      case "out_for_delivery":
        return <MapPin className={`h-5 w-5 ${iconClass}`} />;
      case "delivered":
        return <CheckCircle className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Clock className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      received_from_supplier: "Received from Supplier",
      processing: "Processing",
      in_transit: "In Transit",
      customs: "At Customs",
      received_muscat_wh: "Received Muscat WH",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
    };
    return statusMap[status] || status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage
      .from("shipment-documents")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="relative space-y-8">
      {statusHistory.map((item, index) => {
        const isLatest = index === 0;
        
        return (
          <div key={item.id} className="relative flex gap-4 animate-fade-in">
            {/* Timeline line */}
            {index !== statusHistory.length - 1 && (
              <div className="absolute left-5 top-10 w-0.5 h-full bg-border" />
            )}
            
            {/* Status icon */}
            <div
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                isLatest ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
            >
              {getStatusIcon(item.status, isLatest)}
            </div>

            {/* Status details */}
            <div className="flex-1 space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <p className={`font-semibold ${isLatest ? "text-primary" : "text-foreground"}`}>
                  {formatStatus(item.status)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              
              {item.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </p>
              )}
              
              {item.notes && (
                <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
              )}

              {/* Container tracking for in_transit */}
              {item.status === "in_transit" && statusDetails.container_number && (
                <div className="mt-2 p-3 rounded-lg border bg-muted/50">
                  <p className="text-sm font-medium">Container: {statusDetails.container_number}</p>
                  {statusDetails.container_tracking_url && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1"
                      asChild
                    >
                      <a
                        href={statusDetails.container_tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        🔗 Track Container Live
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {/* Driver details for out_for_delivery */}
              {item.status === "out_for_delivery" && statusDetails.wms_drivers && (
                <div className="mt-2 p-3 rounded-lg border bg-muted/50">
                  <p className="text-sm font-semibold">Driver: {statusDetails.wms_drivers.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    📞 {statusDetails.wms_drivers.phone}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    🚚 {statusDetails.wms_drivers.vehicle_type} ({statusDetails.wms_drivers.vehicle_number})
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    asChild
                  >
                    <a href={`tel:${statusDetails.wms_drivers.phone}`}>
                      <Phone className="h-3 w-3 mr-1" />
                      Call Driver
                    </a>
                  </Button>
                </div>
              )}

              {/* Status photos */}
              {statusPhotos[item.status] && statusPhotos[item.status].length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-2">Photos:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {statusPhotos[item.status].slice(0, 5).map((photo, photoIndex) => (
                      <a
                        key={photoIndex}
                        href={getPhotoUrl(photo.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={getPhotoUrl(photo.file_path)}
                          alt={`Status photo ${photoIndex + 1}`}
                          className="w-full h-20 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrackingTimeline;
