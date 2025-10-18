import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, DollarSign, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  currency: string;
  order_id: string;
  wms_orders?: {
    order_number: string;
    status: string;
  };
}

export function CustomerInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get customer ID from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("wms_customer_id")
        .eq("id", user.id)
        .single();

      if (!profile?.wms_customer_id) {
        setLoading(false);
        return;
      }

      // Load invoices for the customer
      const { data, error } = await supabase
        .from("wms_invoices")
        .select(`
          *,
          wms_orders (
            order_number,
            status
          )
        `)
        .eq("customer_id", profile.wms_customer_id)
        .order("invoice_date", { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { invoiceId },
      });

      if (error) throw error;

      // Create a download link
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No invoices found</p>
          <p className="text-sm text-muted-foreground text-center">
            Invoices will appear here once orders are delivered and confirmed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="shadow-card hover:shadow-elevated transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                  <CardDescription>
                    {invoice.wms_orders?.order_number && `Order: ${invoice.wms_orders.order_number}`}
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge(invoice.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <p className="text-sm">Invoice Date</p>
                </div>
                <p className="font-medium">
                  {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <p className="text-sm">Due Date</p>
                </div>
                <p className="font-medium">
                  {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-sm">Total Amount</p>
                </div>
                <p className="text-2xl font-bold text-accent">
                  {invoice.currency} {invoice.total_amount.toFixed(3)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="font-medium">
                    {invoice.currency} {invoice.subtotal.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax ({((invoice.tax_amount / invoice.subtotal) * 100).toFixed(1)}%)</p>
                  <p className="font-medium">
                    {invoice.currency} {invoice.tax_amount.toFixed(3)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {invoice.status === "pending" && (
                <Button>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
