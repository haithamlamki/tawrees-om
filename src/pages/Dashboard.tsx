import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, CheckCircle, XCircle, Ship, Settings, User, FileText, Bell } from "lucide-react";
import { toast } from "sonner";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import DocumentManager from "@/components/documents/DocumentManager";
import NotificationSettings from "@/components/notifications/NotificationSettings";

interface ShipmentRequest {
  id: string;
  shipping_type: string;
  calculation_method: string;
  calculated_cost: number;
  status: string;
  created_at: string;
  shipments?: Shipment[];
}

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ShipmentRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const adminRole = roles?.some(r => r.role === "admin");
    setIsAdmin(!!adminRole);

    await loadRequests(session.user.id, !!adminRole);
    setLoading(false);
  };

  const loadRequests = async (userId: string, isAdmin: boolean) => {
    let query = supabase
      .from("shipment_requests")
      .select(`
        *,
        shipments (
          id,
          tracking_number,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("customer_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load shipment requests");
      return;
    }

    setRequests(data || []);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      completed: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case "approved":
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "completed":
        return <Package className="h-5 w-5 text-accent" />;
      default:
        return <Ship className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={true} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage all shipment requests and settings" : "Track your shipment requests"}
          </p>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">
              <Package className="mr-2 h-4 w-4" />
              Shipment Requests
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" onClick={() => navigate("/admin")}>
                <Settings className="mr-2 h-4 w-4" />
                Admin Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No shipment requests yet</p>
                  <Button onClick={() => navigate("/")}>
                    Create New Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="shadow-card hover:shadow-elevated transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <CardTitle className="text-lg">
                            {request.shipping_type.toUpperCase()} Shipment
                          </CardTitle>
                          <CardDescription>
                            {request.calculation_method} • {new Date(request.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="text-2xl font-bold text-accent">
                          ${request.calculated_cost.toFixed(2)}
                        </p>
                      </div>
                      {request.shipments && request.shipments.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/tracking/${request.shipments![0].tracking_number}`)}
                        >
                          Track Shipment
                        </Button>
                      )}
                    </div>

                    {/* Document Manager */}
                    <DocumentManager shipmentRequestId={request.id} />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
