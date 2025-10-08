import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WMSInventory() {
  const { data: customer } = useWMSCustomer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Warehouse Inventory</h1>
        <p className="text-muted-foreground">Manage your stored products</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Inventory management features will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
