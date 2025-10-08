import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requestNotificationPermission, subscribeToPushNotifications, unsubscribeFromPushNotifications } from "@/utils/pushNotifications";

interface NotificationPreferencesProps {
  userId: string;
}

export const NotificationPreferences = ({ userId }: NotificationPreferencesProps) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    in_app_notifications: true,
    email_on_status_update: true,
    email_on_quote_ready: true,
    email_on_request_approved: true,
    email_on_document_uploaded: true,
    browser_push_enabled: false,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) setPreferences(data);
    } catch (error: any) {
      console.error("Load preferences error:", error);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    setLoading(true);
    try {
      if (key === "browser_push_enabled") {
        if (value) {
          const hasPermission = await requestNotificationPermission();
          if (!hasPermission) {
            toast.error("Browser notification permission denied");
            return;
          }
          await subscribeToPushNotifications(userId);
        } else {
          await unsubscribeFromPushNotifications(userId);
        }
      }

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          [key]: value,
        });

      if (error) throw error;

      setPreferences(prev => ({ ...prev, [key]: value }));
      toast.success("Preferences updated");
    } catch (error: any) {
      console.error("Update preference error:", error);
      toast.error(error.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications within the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="in-app">Enable in-app notifications</Label>
            <Switch
              id="in-app"
              checked={preferences.in_app_notifications}
              onCheckedChange={(checked) =>
                updatePreference("in_app_notifications", checked)
              }
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive browser push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="push">Enable push notifications</Label>
            <Switch
              id="push"
              checked={preferences.browser_push_enabled}
              onCheckedChange={(checked) =>
                updatePreference("browser_push_enabled", checked)
              }
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which events trigger email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="status-update">Shipment status updates</Label>
            <Switch
              id="status-update"
              checked={preferences.email_on_status_update}
              onCheckedChange={(checked) =>
                updatePreference("email_on_status_update", checked)
              }
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="quote-ready">Quote ready</Label>
            <Switch
              id="quote-ready"
              checked={preferences.email_on_quote_ready}
              onCheckedChange={(checked) =>
                updatePreference("email_on_quote_ready", checked)
              }
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="request-approved">Request approved</Label>
            <Switch
              id="request-approved"
              checked={preferences.email_on_request_approved}
              onCheckedChange={(checked) =>
                updatePreference("email_on_request_approved", checked)
              }
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="document-uploaded">Document uploaded</Label>
            <Switch
              id="document-uploaded"
              checked={preferences.email_on_document_uploaded}
              onCheckedChange={(checked) =>
                updatePreference("email_on_document_uploaded", checked)
              }
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};