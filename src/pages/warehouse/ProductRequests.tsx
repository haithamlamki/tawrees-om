import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WMSProductRequests() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Requests</h1>
        <p className="text-muted-foreground">Request new products for storage</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Product request features will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
