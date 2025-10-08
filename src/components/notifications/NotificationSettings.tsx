import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

const NotificationSettings = () => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    in_app_notifications: true,
    email_on_quote_ready: true,
    email_on_request_approved: true,
    email_on_status_update: true,
    email_on_document_uploaded: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences({
          in_app_notifications: data.in_app_notifications,
          email_on_quote_ready: data.email_on_quote_ready,
          email_on_request_approved: data.email_on_request_approved,
          email_on_status_update: data.email_on_status_update,
          email_on_document_uploaded: data.email_on_document_uploaded,
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          [key]: value,
        });

      if (error) throw error;

      setPreferences({ ...preferences, [key]: value });

      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="in_app">In-App Notifications</Label>
          <Switch
            id="in_app"
            checked={preferences.in_app_notifications}
            onCheckedChange={(checked) => updatePreference("in_app_notifications", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="quote_ready">Email on Quote Ready</Label>
          <Switch
            id="quote_ready"
            checked={preferences.email_on_quote_ready}
            onCheckedChange={(checked) => updatePreference("email_on_quote_ready", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="request_approved">Email on Request Approved</Label>
          <Switch
            id="request_approved"
            checked={preferences.email_on_request_approved}
            onCheckedChange={(checked) => updatePreference("email_on_request_approved", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="status_update">Email on Status Update</Label>
          <Switch
            id="status_update"
            checked={preferences.email_on_status_update}
            onCheckedChange={(checked) => updatePreference("email_on_status_update", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="document_uploaded">Email on Document Upload</Label>
          <Switch
            id="document_uploaded"
            checked={preferences.email_on_document_uploaded}
            onCheckedChange={(checked) => updatePreference("email_on_document_uploaded", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
