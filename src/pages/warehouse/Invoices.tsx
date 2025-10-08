import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WMSInvoices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">View and manage invoices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Invoice management features will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
