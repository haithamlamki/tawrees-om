import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { arrayToCSV, downloadCSV } from "@/utils/csvExport";
import { format } from "date-fns";

export const CSVExportButtons = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const exportAgreements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agreements")
        .select("*, origins(name), destinations(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = data?.map((agreement) => ({
        id: agreement.id,
        origin: agreement.origins?.name,
        destination: agreement.destinations?.name,
        rate_type: agreement.rate_type,
        buy_price: agreement.buy_price,
        sell_price: agreement.sell_price,
        margin_percent: agreement.margin_percent,
        min_charge: agreement.min_charge,
        currency: agreement.currency,
        active: agreement.active,
        valid_from: format(new Date(agreement.valid_from), "yyyy-MM-dd"),
        valid_to: agreement.valid_to ? format(new Date(agreement.valid_to), "yyyy-MM-dd") : "",
        notes: agreement.notes || "",
      })) || [];

      const csv = arrayToCSV(exportData);
      downloadCSV(csv, `agreements_${format(new Date(), "yyyy-MM-dd")}.csv`);
      
      toast({
        title: "Success",
        description: "Agreements exported successfully",
      });
    } catch (error) {
      console.error("Error exporting agreements:", error);
      toast({
        title: "Error",
        description: "Failed to export agreements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportShipments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          *,
          request_id(
            shipping_type,
            calculated_cost,
            profiles(full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = data?.map((shipment: any) => ({
        tracking_number: shipment.tracking_number,
        customer_name: shipment.request_id?.profiles?.full_name || "",
        customer_email: shipment.request_id?.profiles?.email || "",
        shipping_type: shipment.request_id?.shipping_type || "",
        cost: shipment.request_id?.calculated_cost || 0,
        status: shipment.status,
        current_location: shipment.current_location || "",
        estimated_delivery: shipment.estimated_delivery 
          ? format(new Date(shipment.estimated_delivery), "yyyy-MM-dd")
          : "",
        actual_delivery: shipment.actual_delivery
          ? format(new Date(shipment.actual_delivery), "yyyy-MM-dd")
          : "",
        created_at: format(new Date(shipment.created_at), "yyyy-MM-dd HH:mm"),
        notes: shipment.notes || "",
      })) || [];

      const csv = arrayToCSV(exportData);
      downloadCSV(csv, `shipments_${format(new Date(), "yyyy-MM-dd")}.csv`);
      
      toast({
        title: "Success",
        description: "Shipments exported successfully",
      });
    } catch (error) {
      console.error("Error exporting shipments:", error);
      toast({
        title: "Error",
        description: "Failed to export shipments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          shipment_request_id(
            profiles(full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = data?.map((quote: any) => ({
        id: quote.id,
        customer_name: quote.shipment_request_id?.profiles?.full_name || "",
        customer_email: quote.shipment_request_id?.profiles?.email || "",
        buy_cost: quote.buy_cost,
        total_sell_price: quote.total_sell_price,
        profit_amount: quote.profit_amount,
        profit_margin_percentage: quote.profit_margin_percentage,
        status: quote.status,
        valid_until: quote.valid_until ? format(new Date(quote.valid_until), "yyyy-MM-dd") : "",
        sent_at: quote.sent_at ? format(new Date(quote.sent_at), "yyyy-MM-dd HH:mm") : "",
        viewed_at: quote.viewed_at ? format(new Date(quote.viewed_at), "yyyy-MM-dd HH:mm") : "",
        paid_at: quote.paid_at ? format(new Date(quote.paid_at), "yyyy-MM-dd HH:mm") : "",
        created_at: format(new Date(quote.created_at), "yyyy-MM-dd HH:mm"),
      })) || [];

      const csv = arrayToCSV(exportData);
      downloadCSV(csv, `quotes_${format(new Date(), "yyyy-MM-dd")}.csv`);
      
      toast({
        title: "Success",
        description: "Quotes exported successfully",
      });
    } catch (error) {
      console.error("Error exporting quotes:", error);
      toast({
        title: "Error",
        description: "Failed to export quotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_statistics")
        .select("*")
        .order("total_spent", { ascending: false });

      if (error) throw error;

      const exportData = data?.map((customer) => ({
        full_name: customer.full_name,
        email: customer.email,
        company_name: customer.company_name || "",
        total_requests: customer.total_requests,
        approved_requests: customer.approved_requests,
        total_shipments: customer.total_shipments,
        total_spent: customer.total_spent,
        last_request_date: customer.last_request_date
          ? format(new Date(customer.last_request_date), "yyyy-MM-dd")
          : "",
      })) || [];

      const csv = arrayToCSV(exportData);
      downloadCSV(csv, `customers_${format(new Date(), "yyyy-MM-dd")}.csv`);
      
      toast({
        title: "Success",
        description: "Customers exported successfully",
      });
    } catch (error) {
      console.error("Error exporting customers:", error);
      toast({
        title: "Error",
        description: "Failed to export customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAgreements}>
          <Download className="h-4 w-4 mr-2" />
          Export Agreements
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportShipments}>
          <Download className="h-4 w-4 mr-2" />
          Export Shipments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportQuotes}>
          <Download className="h-4 w-4 mr-2" />
          Export Quotes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCustomers}>
          <Download className="h-4 w-4 mr-2" />
          Export Customers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
