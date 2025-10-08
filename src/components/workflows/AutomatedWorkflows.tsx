import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Package, FileCheck, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  category: 'notification' | 'automation' | 'alert';
}

export const AutomatedWorkflows = () => {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([
    {
      id: 'order_confirmation',
      name: 'Order Confirmation Emails',
      description: 'Automatically send confirmation emails when orders are placed',
      icon: Mail,
      enabled: true,
      category: 'notification',
    },
    {
      id: 'shipment_updates',
      name: 'Shipment Status Updates',
      description: 'Notify customers when shipment status changes',
      icon: Package,
      enabled: true,
      category: 'notification',
    },
    {
      id: 'low_stock_alerts',
      name: 'Low Stock Alerts',
      description: 'Alert when inventory falls below minimum levels',
      icon: AlertTriangle,
      enabled: true,
      category: 'alert',
    },
    {
      id: 'invoice_generation',
      name: 'Auto Invoice Generation',
      description: 'Automatically generate invoices when orders are completed',
      icon: FileCheck,
      enabled: true,
      category: 'automation',
    },
    {
      id: 'delivery_reminders',
      name: 'Delivery Reminders',
      description: 'Send reminders 24h before scheduled delivery',
      icon: Bell,
      enabled: false,
      category: 'notification',
    },
    {
      id: 'whatsapp_updates',
      name: 'WhatsApp Status Updates',
      description: 'Send shipment updates via WhatsApp',
      icon: MessageSquare,
      enabled: false,
      category: 'notification',
    },
  ]);

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => 
      prev.map(w => 
        w.id === workflowId 
          ? { ...w, enabled: !w.enabled }
          : w
      )
    );
    
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      toast.success(
        workflow.enabled 
          ? `${workflow.name} disabled` 
          : `${workflow.name} enabled`
      );
    }
  };

  const getCategoryColor = (category: WorkflowConfig['category']) => {
    switch (category) {
      case 'notification': return 'bg-blue-500/10 text-blue-500';
      case 'automation': return 'bg-green-500/10 text-green-500';
      case 'alert': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const groupedWorkflows = {
    notification: workflows.filter(w => w.category === 'notification'),
    automation: workflows.filter(w => w.category === 'automation'),
    alert: workflows.filter(w => w.category === 'alert'),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Automated Workflows</h2>
        <p className="text-muted-foreground">
          Configure automated notifications, alerts, and business processes
        </p>
      </div>

      {Object.entries(groupedWorkflows).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4 capitalize">{category} Workflows</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((workflow) => {
              const Icon = workflow.icon;
              return (
                <Card key={workflow.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <Badge 
                            variant="secondary" 
                            className={getCategoryColor(workflow.category)}
                          >
                            {workflow.category}
                          </Badge>
                        </div>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={workflow.id}
                        checked={workflow.enabled}
                        onCheckedChange={() => toggleWorkflow(workflow.id)}
                      />
                      <Label htmlFor={workflow.id} className="cursor-pointer">
                        {workflow.enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Workflow Statistics</CardTitle>
          <CardDescription>Overview of automated workflow performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {workflows.filter(w => w.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Workflows</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">1,247</div>
              <div className="text-sm text-muted-foreground">Actions This Month</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">98.5%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
