import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: string;
  statusHistory?: Array<{
    status: string;
    location?: string;
    created_at: string;
    notes?: string;
  }>;
}

const statusSteps = [
  { key: "received_from_supplier", label: "Received from Supplier" },
  { key: "processing", label: "Processing" },
  { key: "pending_partner_acceptance", label: "Pending Partner Acceptance" },
  { key: "in_transit", label: "In Transit" },
  { key: "customs", label: "Customs Clearance" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

export function StatusTimeline({ currentStatus, statusHistory = [] }: StatusTimelineProps) {
  const currentStepIndex = statusSteps.findIndex((step) => step.key === currentStatus);

  const getStepStatus = (index: number) => {
    if (currentStatus === "rejected") return "rejected";
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "current";
    return "pending";
  };

  const getIcon = (status: string) => {
    if (status === "rejected") return <XCircle className="h-6 w-6 text-destructive" />;
    if (status === "completed") return <CheckCircle2 className="h-6 w-6 text-success" />;
    if (status === "current") return <Circle className="h-6 w-6 text-primary fill-primary" />;
    return <Circle className="h-6 w-6 text-muted-foreground" />;
  };

  if (currentStatus === "rejected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-destructive">
            <XCircle className="h-6 w-6" />
            <div>
              <p className="font-medium">Order Rejected</p>
              <p className="text-sm text-muted-foreground">
                This order has been rejected and returned to processing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-2 min-w-max">
            {statusSteps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const historyItem = statusHistory.find((h) => h.status === step.key);

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[120px]">
                    {getIcon(stepStatus)}
                    <p
                      className={`text-xs font-medium mt-2 text-center ${
                        stepStatus === "current"
                          ? "text-primary"
                          : stepStatus === "completed"
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {historyItem && (
                      <div className="text-xs text-muted-foreground mt-1 text-center">
                        <p>{new Date(historyItem.created_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`h-0.5 w-8 ${
                        stepStatus === "completed" ? "bg-success" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {statusHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <p className="font-medium mb-3">Detailed History</p>
            <div className="space-y-2 text-sm">
              {statusHistory.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.status.replace(/_/g, " ").toUpperCase()}</p>
                    {item.location && <p className="text-muted-foreground">{item.location}</p>}
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
