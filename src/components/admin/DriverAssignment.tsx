import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";

interface DriverAssignmentProps {
  orderId: string;
  currentDriverId?: string;
  customerId: string;
}

export function DriverAssignment({ orderId, currentDriverId, customerId }: DriverAssignmentProps) {
  const [selectedDriver, setSelectedDriver] = useState(currentDriverId || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available drivers
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_drivers")
        .select("id, name, status, vehicle_type")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Assign driver mutation
  const assignMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from("wms_orders")
        .update({ 
          assigned_driver_id: driverId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      
      if (error) throw error;

      // Update driver status to on_delivery
      await supabase
        .from("wms_drivers")
        .update({ status: "on_delivery" })
        .eq("id", driverId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-orders"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({
        title: "Driver assigned",
        description: "Driver has been assigned to this order successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unassign driver mutation
  const unassignMutation = useMutation({
    mutationFn: async () => {
      if (!currentDriverId) return;

      const { error } = await supabase
        .from("wms_orders")
        .update({ 
          assigned_driver_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      
      if (error) throw error;

      // Update driver status back to available
      await supabase
        .from("wms_drivers")
        .update({ status: "available" })
        .eq("id", currentDriverId);
    },
    onSuccess: () => {
      setSelectedDriver("");
      queryClient.invalidateQueries({ queryKey: ["wms-orders"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({
        title: "Driver unassigned",
        description: "Driver has been removed from this order",
      });
    },
  });

  const handleAssign = () => {
    if (!selectedDriver) {
      toast({
        title: "No driver selected",
        description: "Please select a driver to assign",
        variant: "destructive",
      });
      return;
    }
    assignMutation.mutate(selectedDriver);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-muted-foreground" />
        <Label>Assign Driver</Label>
      </div>
      
      <div className="flex gap-2">
        <Select
          value={selectedDriver}
          onValueChange={setSelectedDriver}
          disabled={isLoading || assignMutation.isPending}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select driver..." />
          </SelectTrigger>
          <SelectContent>
            {drivers?.map((driver) => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.name} - {driver.status === "available" ? "Available" : "On Delivery"}
                {driver.vehicle_type && ` (${driver.vehicle_type})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleAssign}
          disabled={!selectedDriver || assignMutation.isPending}
        >
          {assignMutation.isPending ? "Assigning..." : "Assign"}
        </Button>

        {currentDriverId && (
          <Button
            variant="outline"
            onClick={() => unassignMutation.mutate()}
            disabled={unassignMutation.isPending}
          >
            {unassignMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        )}
      </div>

      {currentDriverId && drivers && (
        <div className="text-sm text-muted-foreground">
          Current driver: {drivers.find(d => d.id === currentDriverId)?.name || "Unknown"}
        </div>
      )}
    </div>
  );
}
