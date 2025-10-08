import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Workflow } from "lucide-react";

export default function AdminWMSWorkflow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["wms-workflow-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_workflow_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (settings?.id) {
        const { error } = await supabase
          .from("wms_workflow_settings")
          .update(data)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wms_workflow_settings")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-workflow-settings"] });
      toast({ title: "Workflow settings updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating settings", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      require_order_approval: formData.get("require_order_approval") === "on",
      auto_approve_threshold: Number(formData.get("auto_approve_threshold")) || null,
      notification_preferences: {},
    };
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Workflow Settings</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Settings</h1>
        <p className="text-muted-foreground">Configure workflow automation and approval rules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Order Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_order_approval">Require Order Approval</Label>
                <p className="text-sm text-muted-foreground">
                  All orders will require manual approval before processing
                </p>
              </div>
              <Switch
                id="require_order_approval"
                name="require_order_approval"
                defaultChecked={settings?.require_order_approval}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto_approve_threshold">Auto-Approve Threshold (OMR)</Label>
              <Input
                id="auto_approve_threshold"
                name="auto_approve_threshold"
                type="number"
                step="0.01"
                defaultValue={settings?.auto_approve_threshold || ""}
                placeholder="e.g., 100.00"
              />
              <p className="text-sm text-muted-foreground">
                Orders below this amount will be automatically approved (leave empty to disable)
              </p>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Order Approval</p>
              <p className="text-2xl font-bold">
                {settings?.require_order_approval ? "Required" : "Not Required"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Auto-Approve Threshold</p>
              <p className="text-2xl font-bold">
                {settings?.auto_approve_threshold
                  ? `${settings.auto_approve_threshold} OMR`
                  : "Disabled"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold text-green-600">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
