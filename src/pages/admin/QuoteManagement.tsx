import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Mail, Phone, Calendar, DollarSign, Package } from "lucide-react";
import Navigation from "@/components/Navigation";
import { format } from "date-fns";

interface ProductQuote {
  id: string;
  quote_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  created_at: string;
  valid_until: string;
  product_id: string;
  products?: {
    name: string;
    sku: string;
  };
}

export default function QuoteManagement() {
  const [quotes, setQuotes] = useState<ProductQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, [filter]);

  const fetchQuotes = async () => {
    try {
      let query = supabase
        .from("product_quotes")
        .select(`
          *,
          products:product_id (
            name,
            sku
          )
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("product_quotes")
        .update({ 
          status: newStatus,
          ...(newStatus === "won" && { won_at: new Date().toISOString() })
        })
        .eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quote marked as ${newStatus}`,
      });

      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-500";
      case "opened": return "bg-yellow-500";
      case "won": return "bg-green-500";
      case "lost": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation isAuthenticated={true} />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Quote Management</h1>
          <p className="text-muted-foreground">Manage and track product quotes</p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "sent" ? "default" : "outline"}
            onClick={() => setFilter("sent")}
          >
            Sent
          </Button>
          <Button
            variant={filter === "opened" ? "default" : "outline"}
            onClick={() => setFilter("opened")}
          >
            Opened
          </Button>
          <Button
            variant={filter === "won" ? "default" : "outline"}
            onClick={() => setFilter("won")}
          >
            Won
          </Button>
          <Button
            variant={filter === "lost" ? "default" : "outline"}
            onClick={() => setFilter("lost")}
          >
            Lost
          </Button>
        </div>

        {quotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No quotes found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quotes.map((quote) => (
              <Card key={quote.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Quote #{quote.quote_id}
                      </CardTitle>
                      <CardDescription>
                        {quote.products?.name} ({quote.products?.sku})
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{quote.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${quote.customer_email}`} className="text-primary hover:underline">
                          {quote.customer_email}
                        </a>
                      </div>
                      {quote.customer_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${quote.customer_phone}`} className="text-primary hover:underline">
                            {quote.customer_phone}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>Qty: {quote.quantity} @ ${quote.unit_price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">Total: ${quote.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Created: {format(new Date(quote.created_at), "MMM dd, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Valid until: {format(new Date(quote.valid_until), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {quote.status === "sent" || quote.status === "opened" ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateQuoteStatus(quote.id, "won")}
                        >
                          Mark as Won
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuoteStatus(quote.id, "lost")}
                        >
                          Mark as Lost
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
