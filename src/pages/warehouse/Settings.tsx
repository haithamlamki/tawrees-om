import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WMSSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings features will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
