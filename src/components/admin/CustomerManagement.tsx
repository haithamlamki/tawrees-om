import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";
import { toast } from "sonner";

interface CustomerStats {
  customer_id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  total_requests: number;
  approved_requests: number;
  total_shipments: number;
  total_spent: number;
  last_request_date: string | null;
}

const CustomerManagement = () => {
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(
        (customer) =>
          customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customer_statistics")
      .select("*")
      .order("total_spent", { ascending: false });

    if (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
      return;
    }

    setCustomers(data || []);
    setFilteredCustomers(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Management</CardTitle>
        <CardDescription>View and manage customer information and statistics</CardDescription>
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No customers found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Shipments</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell className="font-medium">{customer.full_name}</TableCell>
                  <TableCell>{customer.company_name || "-"}</TableCell>
                  <TableCell className="text-sm">{customer.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{customer.total_requests}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{customer.approved_requests}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{customer.total_shipments}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-accent">
                    ${customer.total_spent.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {customer.last_request_date
                      ? new Date(customer.last_request_date).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;
