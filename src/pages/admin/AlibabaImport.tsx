import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, FileDown, AlertCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import ProductPreviewDrawer from "@/components/admin/ProductPreviewDrawer";

export default function AlibabaImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [alibabaUrl, setAlibabaUrl] = useState("");
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [extractedProduct, setExtractedProduct] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate URL
      if (!alibabaUrl.includes("alibaba.com")) {
        throw new Error("Please enter a valid Alibaba product URL");
      }

      // Call scrape-alibaba-product edge function
      const { data: scrapedData, error: scrapeError } = await supabase.functions.invoke(
        'scrape-alibaba-product',
        {
          body: { url: alibabaUrl },
        }
      );

      if (scrapeError) throw scrapeError;

      // Check for duplicate
      if (scrapedData.isDuplicate) {
        toast({
          title: "Duplicate Product",
          description: "This product has already been imported. Opening existing draft.",
          variant: "destructive",
        });
        navigate(`/admin/products/${scrapedData.existingProductId}/edit`);
        return;
      }

      let productData = scrapedData.product;

      // Enhance content if enabled
      if (autoEnhance) {
        const { data: enhancedData, error: enhanceError } = await supabase.functions.invoke(
          'enhance-product-content',
          {
            body: { product: productData },
          }
        );

        if (enhanceError) {
          console.error("Enhancement failed:", enhanceError);
          toast({
            title: "Enhancement Warning",
            description: "AI enhancement failed, using raw data",
            variant: "destructive",
          });
        } else {
          productData = { ...productData, ...enhancedData.enhanced };
        }
      }

      setExtractedProduct({
        ...productData,
        source_type: 'alibaba',
        source_url: alibabaUrl,
        source_hash: scrapedData.sourceHash,
        html_snapshot_id: scrapedData.snapshotId,
        status: 'draft',
      });
      setShowPreview(true);

      if (window.gtag) {
        window.gtag('event', 'alibaba_import_success', {
          url: alibabaUrl,
          enhanced: autoEnhance,
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      setError(error.message || "Failed to import product");
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import product from Alibaba",
        variant: "destructive",
      });

      if (window.gtag) {
        window.gtag('event', 'alibaba_import_failed', {
          url: alibabaUrl,
          error: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Ensure field constraints are met before saving
      const productData = {
        ...extractedProduct,
        meta_description: extractedProduct.meta_description?.substring(0, 160) || null,
        meta_title: extractedProduct.meta_title?.substring(0, 60) || null,
        summary: extractedProduct.summary?.substring(0, 160) || null,
        short_name: extractedProduct.short_name?.substring(0, 30) || extractedProduct.name?.substring(0, 30),
        created_by: session.user.id,
        updated_by: session.user.id,
      };

      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product saved as draft",
      });

      navigate(`/admin/products/${data.id}/edit`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Import from Alibaba</h1>
            <p className="text-muted-foreground">
              Paste a product URL to auto-fill product details
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alibaba Product Import</CardTitle>
            <CardDescription>
              We'll fetch images, price tiers, MOQ, and specs. You can review and edit before
              publishing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImport} className="space-y-6">
              <div>
                <Label htmlFor="alibabaUrl">Alibaba Product URL *</Label>
                <Input
                  id="alibabaUrl"
                  type="url"
                  value={alibabaUrl}
                  onChange={(e) => setAlibabaUrl(e.target.value)}
                  placeholder="https://www.alibaba.com/product-detail/..."
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: https://www.alibaba.com/product-detail/Hydraulic-Jack_123456.html
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoEnhance"
                  checked={autoEnhance}
                  onCheckedChange={(checked) => setAutoEnhance(checked as boolean)}
                />
                <Label htmlFor="autoEnhance" className="text-sm font-normal cursor-pointer">
                  Auto-enhance titles, bullets, and SEO (uses AI)
                </Label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <FileDown className="h-4 w-4" />
                <AlertDescription>
                  Please ensure you have the rights to use this content. We store the original URL
                  for compliance.
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Importing..." : "Import Product"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ProductPreviewDrawer
          open={showPreview}
          onClose={() => setShowPreview(false)}
          product={extractedProduct}
          onSaveDraft={handleSaveDraft}
          onEdit={() => {
            setShowPreview(false);
            handleSaveDraft();
          }}
        />
      </div>
    </div>
  );
}
