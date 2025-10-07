import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TopCustomer {
  customer_id: string;
  full_name: string;
  company_name: string | null;
  total_spent: number;
  total_requests: number;
  approved_requests: number;
}

const TopCustomers = () => {
  const [customers, setCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopCustomers();
  }, []);

  const loadTopCustomers = async () => {
    const { data, error } = await supabase
      .from("customer_statistics")
      .select("*")
      .order("total_spent", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error loading top customers:", error);
      setLoading(false);
      return;
    }

    setCustomers(data || []);
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers</CardTitle>
        <CardDescription>Highest spending customers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customers.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No customers yet</p>
        ) : (
          customers.map((customer, index) => (
            <div
              key={customer.customer_id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(customer.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -left-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{customer.full_name}</p>
                  {customer.company_name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {customer.company_name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {customer.total_requests} requests
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {customer.approved_requests} approved
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-primary">
                  ${customer.total_spent.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total spent</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default TopCustomers;
