import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { useWMSPermissions } from "@/hooks/useWMSPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function WorkflowSettings() {
  const { data: customer } = useWMSCustomer();
  const { data: permissions } = useWMSPermissions();
  const queryClient = useQueryClient();

  // Fetch workflow settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["wms-workflow-settings", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_workflow_settings")
        .select("*")
        .eq("customer_id", customer!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Return default settings if none exist
      return data || {
        customer_id: customer!.id,
        require_order_approval: true,
        auto_approve_threshold: null,
        employee_can_view_all_orders: false,
        employee_restricted_to_branch: true
      };
    },
  });

  const [formData, setFormData] = useState(settings);

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("wms_workflow_settings")
        .upsert({
          ...formData,
          customer_id: customer!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Workflow settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["wms-workflow-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  if (!permissions?.canManageWorkflow) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            You don't have permission to manage workflow settings. Only customer owners and admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !formData) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Settings</h1>
        <p className="text-muted-foreground">Configure order approval and employee permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Approval Workflow</CardTitle>
          <CardDescription>Control how orders are approved in your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Manual Approval</Label>
              <div className="text-sm text-muted-foreground">
                When enabled, all orders must be manually approved by an admin
              </div>
            </div>
            <Switch
              checked={formData.require_order_approval}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, require_order_approval: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Auto-Approve Threshold (OMR)</Label>
            <div className="text-sm text-muted-foreground mb-2">
              Orders below this amount will be automatically approved (leave empty to disable)
            </div>
            <Input
              type="number"
              step="0.001"
              placeholder="e.g., 100.000"
              value={formData.auto_approve_threshold || ""}
              onChange={(e) => 
                setFormData({ 
                  ...formData, 
                  auto_approve_threshold: e.target.value ? parseFloat(e.target.value) : null 
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Permissions</CardTitle>
          <CardDescription>Control what employees can see and do</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Employees Can View All Orders</Label>
              <div className="text-sm text-muted-foreground">
                When enabled, employees can see all orders, not just their own
              </div>
            </div>
            <Switch
              checked={formData.employee_can_view_all_orders}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, employee_can_view_all_orders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Restrict Employees to Branch</Label>
              <div className="text-sm text-muted-foreground">
                When enabled, employees can only see inventory and orders for their assigned branch
              </div>
            </div>
            <Switch
              checked={formData.employee_restricted_to_branch}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, employee_restricted_to_branch: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}