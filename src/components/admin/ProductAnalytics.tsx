import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Package, DollarSign, Users, Loader2 } from "lucide-react";

interface Analytics {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalQuotes: number;
  wonQuotes: number;
  totalQuoteValue: number;
  conversionRate: number;
}

export default function ProductAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch product stats
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("status");

      if (productsError) throw productsError;

      const totalProducts = products?.length || 0;
      const publishedProducts = products?.filter(p => p.status === "published").length || 0;
      const draftProducts = products?.filter(p => p.status === "draft").length || 0;

      // Fetch quote stats
      const { data: quotes, error: quotesError } = await supabase
        .from("product_quotes")
        .select("status, total_amount");

      if (quotesError) throw quotesError;

      const totalQuotes = quotes?.length || 0;
      const wonQuotes = quotes?.filter(q => q.status === "won").length || 0;
      const totalQuoteValue = quotes
        ?.filter(q => q.status === "won")
        .reduce((sum, q) => sum + Number(q.total_amount), 0) || 0;
      const conversionRate = totalQuotes > 0 ? (wonQuotes / totalQuotes) * 100 : 0;

      setAnalytics({
        totalProducts,
        publishedProducts,
        draftProducts,
        totalQuotes,
        wonQuotes,
        totalQuoteValue,
        conversionRate,
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            {analytics.publishedProducts} published, {analytics.draftProducts} drafts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalQuotes}</div>
          <p className="text-xs text-muted-foreground">
            {analytics.wonQuotes} won
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quote Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${analytics.totalQuoteValue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            From won quotes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.conversionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Quotes to wins
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
