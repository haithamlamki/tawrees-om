import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Product, PricingTier } from "@/types/products";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Eye } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    short_name: "",
    slug: "",
    sku: "",
    category: "",
    tags: [],
    youtube_id: "",
    youtube_title: "",
    hero_thumbnail: "",
    gallery_images: [],
    currency: "OMR",
    base_unit_price: 0,
    min_order_qty: 1,
    pricing_tiers: [],
    weight_kg: 0,
    dims_cm: { l: 0, w: 0, h: 0 },
    origin_country: "CN",
    lead_time_days: 14,
    delivery_options: ["pickup", "door"],
    quote_validity_days: 7,
    summary: "",
    highlight_bullets: ["", "", ""],
    description: "",
    specs: {},
    meta_title: "",
    meta_description: "",
    status: "draft",
    source_type: "manual",
  });

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
  };

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          ...data,
          gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images as string[] : [],
          tags: Array.isArray(data.tags) ? data.tags as string[] : [],
          highlight_bullets: Array.isArray(data.highlight_bullets) ? data.highlight_bullets as string[] : ["", "", ""],
          pricing_tiers: Array.isArray(data.pricing_tiers) ? data.pricing_tiers as any : [],
          delivery_options: Array.isArray(data.delivery_options) ? data.delivery_options as string[] : ["pickup", "door"],
          specs: typeof data.specs === 'object' && data.specs ? data.specs as any : {},
          dims_cm: data.dims_cm ? data.dims_cm as any : { l: 0, w: 0, h: 0 },
        } as unknown as Partial<Product>);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e?: React.FormEvent, statusOverride?: string) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Exclude volume_cbm as it's a generated column
      const { volume_cbm, ...dataToSave } = formData;
      
      const productData: any = {
        ...dataToSave,
        slug: formData.slug || generateSlug(formData.name || ""),
        updated_by: userId,
        ...(statusOverride && { status: statusOverride }),
        ...(statusOverride === "published" && !formData.published_at && { published_at: new Date().toISOString() }),
        ...(id ? {} : { created_by: userId }),
      };

      if (id) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Success",
          description: statusOverride === "published" ? "Product published successfully" : "Product updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([productData] as any);

        if (error) throw error;

        toast({
          title: "Success",
          description: statusOverride === "published" ? "Product published successfully" : "Product created successfully",
        });
      }

      navigate("/admin/products");
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

  const handlePublish = async () => {
    // Validation - check for actual values, not just falsy
    const missingFields = [];
    const invalidFields = [];
    
    if (!formData.youtube_id?.trim()) missingFields.push("YouTube ID");
    if (!formData.hero_thumbnail?.trim()) missingFields.push("Hero Thumbnail");
    if (!formData.base_unit_price || formData.base_unit_price <= 0) missingFields.push("Base Price (must be > 0)");
    if (!formData.min_order_qty || formData.min_order_qty <= 0) invalidFields.push("Min Order Qty (must be > 0)");
    if (!formData.summary?.trim()) missingFields.push("Summary");
    
    // Check length constraints
    if (formData.meta_description && formData.meta_description.length > 160) {
      invalidFields.push("Meta Description (max 160 chars)");
    }
    if (formData.meta_title && formData.meta_title.length > 60) {
      invalidFields.push("Meta Title (max 60 chars)");
    }

    const errors = [...missingFields, ...invalidFields];
    if (errors.length > 0) {
      toast({
        title: "Cannot Publish",
        description: `Please fix: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    await handleSubmit(undefined, "published");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{id ? "Edit Product" : "Create Product"}</h1>
              <p className="text-muted-foreground">Fill in the product details below</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePublish}>
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: generateSlug(name),
                        short_name: name.substring(0, 30),
                      });
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="short_name">Short Name (≤30 chars) *</Label>
                  <Input
                    id="short_name"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    maxLength={30}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags?.join(", ") || ""}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="youtube_id">YouTube Video ID *</Label>
                <Input
                  id="youtube_id"
                  value={formData.youtube_id}
                  onChange={(e) => setFormData({ ...formData, youtube_id: e.target.value })}
                  placeholder="dQw4w9WgXcQ"
                  required
                />
              </div>
              <div>
                <Label htmlFor="hero_thumbnail">Hero Thumbnail URL *</Label>
                <Input
                  id="hero_thumbnail"
                  value={formData.hero_thumbnail}
                  onChange={(e) => setFormData({ ...formData, hero_thumbnail: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="base_unit_price">Base Unit Price *</Label>
                  <Input
                    id="base_unit_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.base_unit_price}
                    onChange={(e) => setFormData({ ...formData, base_unit_price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min_order_qty">Min Order Qty *</Label>
                  <Input
                    id="min_order_qty"
                    type="number"
                    min="1"
                    value={formData.min_order_qty}
                    onChange={(e) => setFormData({ ...formData, min_order_qty: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="summary">Summary (≤160 chars)</Label>
                <Textarea
                  id="summary"
                  value={formData.summary || ""}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  maxLength={160}
                  rows={2}
                />
              </div>
              <div>
                <Label>Highlight Bullets (3 bullets, ≤60 chars each)</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    value={formData.highlight_bullets?.[i] || ""}
                    onChange={(e) => {
                      const bullets = [...(formData.highlight_bullets || ["", "", ""])];
                      bullets[i] = e.target.value;
                      setFormData({ ...formData, highlight_bullets: bullets });
                    }}
                    maxLength={60}
                    className="mt-2"
                    placeholder={`Bullet ${i + 1}`}
                  />
                ))}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Logistics */}
          <Card>
            <CardHeader>
              <CardTitle>Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.01"
                    value={formData.weight_kg || 0}
                    onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="dims_l">Length (cm)</Label>
                  <Input
                    id="dims_l"
                    type="number"
                    value={formData.dims_cm?.l || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      dims_cm: { ...formData.dims_cm!, l: parseFloat(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="dims_w">Width (cm)</Label>
                  <Input
                    id="dims_w"
                    type="number"
                    value={formData.dims_cm?.w || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      dims_cm: { ...formData.dims_cm!, w: parseFloat(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="dims_h">Height (cm)</Label>
                  <Input
                    id="dims_h"
                    type="number"
                    value={formData.dims_cm?.h || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      dims_cm: { ...formData.dims_cm!, h: parseFloat(e.target.value) }
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin_country">Origin Country</Label>
                  <Input
                    id="origin_country"
                    value={formData.origin_country}
                    onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lead_time_days">Lead Time (days)</Label>
                  <Input
                    id="lead_time_days"
                    type="number"
                    value={formData.lead_time_days || 0}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
