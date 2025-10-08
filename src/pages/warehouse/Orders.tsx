import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WMSOrders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage warehouse orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Order management features will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
