import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileBarChart, Download, Eye, CreditCard, Search, Filter } from "lucide-react";
import type { WMSInvoiceWithDetails, WMSOrderItemWithInventory } from "@/types/wms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function WMSInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: customer, isLoading: customerLoading } = useWMSCustomer();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<WMSInvoiceWithDetails | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  // Check for payment success/failure
  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (payment === "success" && sessionId) {
      // Verify payment
      supabase.functions
        .invoke("verify-invoice-payment", {
          body: { session_id: sessionId },
        })
        .then(({ data, error }) => {
          if (error) {
            toast({
              title: "Payment verification failed",
              description: error.message,
              variant: "destructive",
            });
          } else if (data?.success) {
            toast({
              title: "Payment successful!",
              description: "Your invoice has been paid.",
            });
            queryClient.invalidateQueries({ queryKey: ["wms-invoices"] });
          }
        });
      
      // Clean up URL
      window.history.replaceState({}, "", "/warehouse/invoices");
    } else if (payment === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "You cancelled the payment process.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/warehouse/invoices");
    }
  }, [searchParams, queryClient, toast]);

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["wms-invoices", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("wms_invoices")
        .select(`
          *,
          order:wms_orders(
            id,
            order_number,
            order_items:wms_order_items(
              id,
              quantity,
              unit_price,
              total_price,
              inventory:wms_inventory(product_name, sku)
            )
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WMSInvoiceWithDetails[];
    },
    enabled: !!customer?.id,
  });

  // Payment mutation - must be declared before any conditional returns
  const payInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke("create-invoice-payment", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPayingInvoice(null);
    },
  });

  if (customerLoading || invoicesLoading) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "overdue": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "cancelled": return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingTotal = invoices?.filter(i => i.status === "pending")
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const paidTotal = invoices?.filter(i => i.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const overdueTotal = invoices?.filter(i => i.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

  const handleViewInvoice = (invoice: WMSInvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
  };

  const handleDownloadInvoice = (invoice: WMSInvoiceWithDetails) => {
    // Placeholder for download functionality
    console.log("Download invoice:", invoice.invoice_number);
  };

  const handlePayInvoice = (invoiceId: string) => {
    setPayingInvoice(invoiceId);
    payInvoiceMutation.mutate(invoiceId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">View and manage invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTotal.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueTotal.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <FileBarChart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{paidTotal.toFixed(2)} OMR</div>
            <p className="text-xs text-muted-foreground">Total paid</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Invoice History</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredInvoices || filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileBarChart className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg font-medium">
                {searchTerm || statusFilter !== "all" ? "No invoices found" : "No invoices yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Invoices will appear here once created"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={invoice.status === "overdue" ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{invoice.subtotal.toFixed(2)} OMR</TableCell>
                      <TableCell className="text-right">{invoice.tax_amount.toFixed(2)} OMR</TableCell>
                      <TableCell className="text-right font-semibold">{invoice.total_amount.toFixed(2)} OMR</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === "pending" && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handlePayInvoice(invoice.id)}
                              disabled={payingInvoice === invoice.id}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              {payingInvoice === invoice.id ? "Processing..." : "Pay"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedInvoice && (
            <>
              <SheetHeader>
                <SheetTitle>Invoice Details</SheetTitle>
                <SheetDescription>
                  Invoice #{selectedInvoice.invoice_number}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Date</p>
                    <p className="font-medium">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={getStatusColor(selectedInvoice.status)}>
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                  {selectedInvoice.paid_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Paid At</p>
                      <p className="font-medium">{new Date(selectedInvoice.paid_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Line Items</h3>
                  {selectedInvoice.order && Array.isArray((selectedInvoice.order as any).order_items) ? (
                    <div className="space-y-3">
                      {((selectedInvoice.order as any).order_items as WMSOrderItemWithInventory[]).map((item) => (
                        <div key={item.id} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.inventory?.product_name || "Unknown Product"}</p>
                            <p className="text-sm text-muted-foreground">SKU: {item.inventory?.sku}</p>
                            <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.total_price.toFixed(2)} OMR</p>
                            <p className="text-sm text-muted-foreground">{item.unit_price.toFixed(2)} OMR each</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">No line items available</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{selectedInvoice.subtotal.toFixed(2)} OMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({((selectedInvoice.tax_amount / selectedInvoice.subtotal) * 100).toFixed(0)}%)</span>
                    <span className="font-medium">{selectedInvoice.tax_amount.toFixed(2)} OMR</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{selectedInvoice.total_amount.toFixed(2)} OMR</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notes</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedInvoice.notes}</p>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => handleDownloadInvoice(selectedInvoice)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {selectedInvoice.status === "pending" && (
                    <Button 
                      className="flex-1"
                      onClick={() => handlePayInvoice(selectedInvoice.id)}
                      disabled={payingInvoice === selectedInvoice.id}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {payingInvoice === selectedInvoice.id ? "Processing..." : "Pay Invoice"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
