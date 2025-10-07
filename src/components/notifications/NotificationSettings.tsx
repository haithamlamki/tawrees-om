import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell } from "lucide-react";

interface NotificationPreferences {
  email_on_quote_ready: boolean;
  email_on_status_update: boolean;
  email_on_request_approved: boolean;
  email_on_document_uploaded: boolean;
  in_app_notifications: boolean;
}

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_on_quote_ready: true,
    email_on_status_update: true,
    email_on_request_approved: true,
    email_on_document_uploaded: true,
    in_app_notifications: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") { // Not found error is ok
      console.error("Error loading preferences:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setPreferences({
        email_on_quote_ready: data.email_on_quote_ready,
        email_on_status_update: data.email_on_status_update,
        email_on_request_approved: data.email_on_request_approved,
        email_on_document_uploaded: data.email_on_document_uploaded,
        in_app_notifications: data.in_app_notifications,
      });
    }
    
    setLoading(false);
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setPreferences({ ...preferences, [key]: value });

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        [key]: value,
      });

    if (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update notification preferences");
      // Revert on error
      loadPreferences();
    } else {
      toast.success("Notification preferences updated");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about shipment updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium">Email Notifications</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_quote">Quote Ready</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails when your quote is ready
              </p>
            </div>
            <Switch
              id="email_quote"
              checked={preferences.email_on_quote_ready}
              onCheckedChange={(checked) => updatePreference("email_on_quote_ready", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_status">Status Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when shipment status changes
              </p>
            </div>
            <Switch
              id="email_status"
              checked={preferences.email_on_status_update}
              onCheckedChange={(checked) => updatePreference("email_on_status_update", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_approved">Request Approved</Label>
              <p className="text-sm text-muted-foreground">
                Email when your shipment request is approved
              </p>
            </div>
            <Switch
              id="email_approved"
              checked={preferences.email_on_request_approved}
              onCheckedChange={(checked) => updatePreference("email_on_request_approved", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_document">Document Uploaded</Label>
              <p className="text-sm text-muted-foreground">
                Notify when admin uploads a document
              </p>
            </div>
            <Switch
              id="email_document"
              checked={preferences.email_on_document_uploaded}
              onCheckedChange={(checked) => updatePreference("email_on_document_uploaded", checked)}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">In-App Notifications</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in_app">Enable In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the app interface
              </p>
            </div>
            <Switch
              id="in_app"
              checked={preferences.in_app_notifications}
              onCheckedChange={(checked) => updatePreference("in_app_notifications", checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
