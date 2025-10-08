import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";

interface OrderTimelineProps {
  orderId: string;
}

export const OrderTimeline = ({ orderId }: OrderTimelineProps) => {
  const { data: order, isLoading } = useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wms_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading timeline...</div>;
  }

  if (!order) {
    return <div className="text-sm text-muted-foreground">Order not found</div>;
  }

  const timelineSteps = [
    {
      label: "Order Created",
      date: order.created_at,
      completed: true,
    },
    {
      label: "Processing",
      date: order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? order.created_at : null,
      completed: ['processing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      label: "Shipped",
      date: order.status === 'shipped' || order.status === 'delivered' ? order.updated_at : null,
      completed: ['shipped', 'delivered'].includes(order.status),
    },
    {
      label: "Delivered",
      date: order.delivered_at,
      completed: order.status === 'delivered',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineSteps.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                {step.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
                {index < timelineSteps.length - 1 && (
                  <div className={`w-0.5 h-12 ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className={`font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(step.date), 'PPp')}
                  </p>
                )}
                {!step.completed && !step.date && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
