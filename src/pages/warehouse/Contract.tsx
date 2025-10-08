import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WMSContract() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contract Details</h1>
        <p className="text-muted-foreground">View your warehouse contract</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contract details will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
