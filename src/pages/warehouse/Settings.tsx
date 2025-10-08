import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function WMSSettings() {
  const { data: customer, isLoading } = useWMSCustomer();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You are not linked to any warehouse customer.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{customer.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer Code</p>
              <p className="font-medium">{customer.customer_code}</p>
            </div>
            {customer.contact_person && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{customer.contact_person}</p>
              </div>
            )}
            {customer.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{customer.email}</p>
              </div>
            )}
            {customer.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">
                {customer.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
