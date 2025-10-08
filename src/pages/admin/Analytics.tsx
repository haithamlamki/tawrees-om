import { AdvancedCharts } from "@/components/analytics/AdvancedCharts";
import { DataExport } from "@/components/analytics/DataExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AutomatedWorkflows } from "@/components/workflows/AutomatedWorkflows";

export default function Analytics() {
  const [userId, setUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roles) {
          setUserRole(roles.role);
        }
      }
    };
    
    getUserData();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive business insights and data analysis
          </p>
        </div>
        <DataExport userId={userId} userRole={userRole} />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <AdvancedCharts />
        </TabsContent>

        <TabsContent value="workflows">
          <AutomatedWorkflows />
        </TabsContent>
      </Tabs>
    </div>
  );
}
