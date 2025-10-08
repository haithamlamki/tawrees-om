import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { TaxCompliantInvoicePDF } from "@/components/invoices/TaxCompliantInvoicePDF";
import { FileText, Send, Download } from "lucide-react";

export default function WMSInvoiceGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [vendorVatin, setVendorVatin] = useState("OM-VATIN-123456789");
  const [customerVatin, setCustomerVatin] = useState("");

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["wms-customers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customers")
        .select("*")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch completed orders for selected customer
  const { data: orders } = useQuery({
    queryKey: ["wms-orders-completed", selectedCustomer],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from("wms_orders")
        .select(`
          *,
          order_items:wms_order_items(
            quantity,
            unit_price,
            total_price,
            inventory:wms_inventory(product_name, sku)
          )
        `)
        .eq("customer_id", selectedCustomer)
        .in("status", ["completed", "delivered"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer,
  });

  // Fetch existing invoices
  const { data: invoices } = useQuery({
    queryKey: ["wms-invoices", selectedCustomer],
    queryFn: async () => {
      let query = supabase
        .from("wms_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (selectedCustomer) {
        query = query.eq("customer_id", selectedCustomer);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || selectedOrders.length === 0) {
        throw new Error("Please select customer and orders");
      }

      const customer = customers?.find((c) => c.id === selectedCustomer);
      if (!customer) throw new Error("Customer not found");

      // Calculate totals from selected orders
      const selectedOrdersData = orders?.filter((o) => selectedOrders.includes(o.id)) || [];
      const subtotal = selectedOrdersData.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      const taxAmount = Math.round(subtotal * 0.05 * 1000) / 1000; // 5% VAT, rounded to 3 decimals
      const totalAmount = subtotal + taxAmount;

      // Create invoice (using existing wms_invoices schema)
      const { data: invoice, error: invoiceError } = await supabase
        .from("wms_invoices")
        .insert([{
          customer_id: selectedCustomer,
          invoice_number: `TEMP-${Date.now()}`, // Will be overridden by trigger
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal,
          tax_rate: 5,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: "pending",
          notes: notes || null,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from orders
      const invoiceItems = selectedOrdersData.flatMap((order) =>
        (order.order_items || []).map((item: any) => ({
          invoice_id: invoice.id,
          description: `${item.inventory?.product_name || "Product"} (${item.inventory?.sku || "N/A"})`,
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          total_price: Number(item.total_price || 0),
          vat_exempt: false,
        }))
      );

      if (invoiceItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("wms_invoice_items")
          .insert(invoiceItems);

        if (itemsError) throw itemsError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-invoices"] });
      toast({ title: "Invoice generated successfully" });
      setSelectedOrders([]);
      setNotes("");
      setCustomerVatin("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to generate invoice", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const customer = customers?.find((c) => c.id === selectedCustomer);
  const selectedOrdersData = orders?.filter((o) => selectedOrders.includes(o.id)) || [];
  const subtotal = selectedOrdersData.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const taxAmount = Math.round(subtotal * 0.05 * 1000) / 1000;
  const totalAmount = subtotal + taxAmount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice Generator</h1>
        <p className="text-muted-foreground">Create VAT-compliant invoices for completed orders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name} ({customer.customer_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <>
                <div>
                  <Label>Select Orders to Invoice</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {orders?.map((order) => (
                      <label key={order.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders([...selectedOrders, order.id]);
                            } else {
                              setSelectedOrders(selectedOrders.filter((id) => id !== order.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {order.order_number} - {Number(order.total_amount || 0).toFixed(3)} OMR
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vendor VATIN</Label>
                    <Input
                      value={vendorVatin}
                      onChange={(e) => setVendorVatin(e.target.value)}
                      placeholder="OM-VATIN-123456789"
                    />
                  </div>
                  <div>
                    <Label>Customer VATIN (Optional)</Label>
                    <Input
                      value={customerVatin}
                      onChange={(e) => setCustomerVatin(e.target.value)}
                      placeholder="OM-VATIN-..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes for invoice..."
                    rows={3}
                  />
                </div>

                {selectedOrders.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{subtotal.toFixed(3)} OMR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT (5%):</span>
                        <span>{taxAmount.toFixed(3)} OMR</span>
                      </div>
                      <div className="flex justify-between font-bold text-base">
                        <span>Total:</span>
                        <span>{totalAmount.toFixed(3)} OMR</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => generateInvoiceMutation.mutate()}
                  disabled={selectedOrders.length === 0 || generateInvoiceMutation.isPending}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices?.slice(0, 10).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString()} - {Number(invoice.total_amount || 0).toFixed(3)} OMR
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button size="sm" variant="outline">
                      <Send className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
