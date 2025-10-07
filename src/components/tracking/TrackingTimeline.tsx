import { CheckCircle, MapPin, Package, Clock } from "lucide-react";

interface StatusHistoryItem {
  id: string;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

interface TrackingTimelineProps {
  statusHistory: StatusHistoryItem[];
}

const TrackingTimeline = ({ statusHistory }: TrackingTimelineProps) => {
  const getStatusIcon = (status: string, isLatest: boolean) => {
    const iconClass = isLatest ? "text-primary" : "text-muted-foreground";
    
    switch (status.toLowerCase()) {
      case "processing":
        return <Package className={`h-5 w-5 ${iconClass}`} />;
      case "in_transit":
        return <MapPin className={`h-5 w-5 ${iconClass}`} />;
      case "delivered":
        return <CheckCircle className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Clock className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
                <p className="text-sm text-muted-foreground">{item.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrackingTimeline;
