import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, DollarSign, Package, Download, Calendar } from "lucide-react";
import type { WMSContract } from "@/types/wms";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function WMSContract() {
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ["wms-contract", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("wms_contracts")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as WMSContract | null;
    },
    enabled: !!customer?.id,
  });

  if (customerLoading || contractLoading) {
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

  if (!contract) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contract Details</h1>
          <p className="text-muted-foreground">View your warehouse contract</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active contract found. Please contact administration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const daysRemaining = Math.ceil(
    (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "expired": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  const totalDays = Math.ceil(
    (new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const elapsedDays = totalDays - daysRemaining;
  const progressPercentage = (elapsedDays / totalDays) * 100;

  const handleDownloadContract = () => {
    console.log("Downloading contract:", contract.contract_number);
    // Placeholder for download functionality
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contract Details</h1>
          <p className="text-muted-foreground">View your warehouse contract information</p>
        </div>
        <Button variant="outline" onClick={handleDownloadContract}>
          <Download className="h-4 w-4 mr-2" />
          Download Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contract Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className={getStatusColor(contract.status)}>{contract.status}</Badge>
            {contract.status === "active" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Contract Progress</span>
                  <span className="font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {daysRemaining} of {totalDays} days remaining
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Fee</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contract.monthly_fee} OMR</div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage Space</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contract.storage_space_sqm} sqm</div>
            <p className="text-xs text-muted-foreground">Allocated space</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contract Information</CardTitle>
            <span className="text-sm text-muted-foreground">#{contract.contract_number}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Basic Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Contract Number</dt>
                  <dd className="font-medium">{contract.contract_number}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Contract Type</dt>
                  <dd className="font-medium">{contract.contract_type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Duration</dt>
                  <dd className="font-medium">{contract.duration_months} months</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Total Amount</dt>
                  <dd className="font-medium">{contract.total_amount} OMR</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Terms & Conditions</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Start Date</dt>
                  <dd className="font-medium">
                    {new Date(contract.start_date).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">End Date</dt>
                  <dd className="font-medium">
                    {new Date(contract.end_date).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Free Transfers</dt>
                  <dd className="font-medium">{contract.free_transfer_count} per month</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Additional Transfer Fee</dt>
                  <dd className="font-medium">{contract.transfer_price_after_limit} OMR</dd>
                </div>
              </dl>
            </div>
          </div>

          {contract.storage_conditions && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Storage Conditions
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{contract.storage_conditions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {contract.status === "active" && daysRemaining < 30 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            Your contract will expire in {daysRemaining} days. Please contact administration to renew.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
