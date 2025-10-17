import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  total_spent: number | null;
  last_request_date: string | null;
}

const CustomerManagement = () => {
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);
  const [viewCustomerOpen, setViewCustomerOpen] = useState(false);

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

  const handleViewCustomer = (customer: CustomerStats) => {
    setSelectedCustomer(customer);
    setViewCustomerOpen(true);
    toast.success(`Opening ${customer.full_name}`);
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
                    ${(customer.total_spent || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {customer.last_request_date
                      ? new Date(customer.last_request_date).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewCustomer(customer)}
                      aria-label={`View ${customer.full_name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Sheet open={viewCustomerOpen} onOpenChange={setViewCustomerOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customer Details</SheetTitle>
            <SheetDescription>View complete customer information and statistics</SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div>
                  <div className="font-medium">{selectedCustomer.full_name}</div>
                  <div className="text-muted-foreground">Company:</div>
                  <div>{selectedCustomer.company_name || "-"}</div>
                  <div className="text-muted-foreground">Email:</div>
                  <div className="text-sm break-all">{selectedCustomer.email || "-"}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Activity Statistics</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Total Requests:</div>
                  <div>
                    <Badge variant="secondary">{selectedCustomer.total_requests}</Badge>
                  </div>
                  <div className="text-muted-foreground">Approved Requests:</div>
                  <div>
                    <Badge variant="default">{selectedCustomer.approved_requests}</Badge>
                  </div>
                  <div className="text-muted-foreground">Total Shipments:</div>
                  <div>
                    <Badge variant="outline">{selectedCustomer.total_shipments}</Badge>
                  </div>
                  <div className="text-muted-foreground">Last Activity:</div>
                  <div>
                    {selectedCustomer.last_request_date
                      ? new Date(selectedCustomer.last_request_date).toLocaleDateString()
                      : "Never"}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold">Financial Summary</h3>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-2xl font-bold text-accent">
                    ${(selectedCustomer.total_spent || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default CustomerManagement;
