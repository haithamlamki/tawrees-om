import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Edit, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductPreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  product: any;
  onSaveDraft: () => void;
  onEdit: () => void;
}

export default function ProductPreviewDrawer({
  open,
  onClose,
  product,
  onSaveDraft,
  onEdit,
}: ProductPreviewDrawerProps) {
  if (!product) return null;

  const missingFields = [];
  if (!product.youtube_id) missingFields.push("YouTube ID");
  if (!product.hero_thumbnail) missingFields.push("Hero Thumbnail");
  if (!product.base_unit_price) missingFields.push("Base Price");
  if (!product.summary) missingFields.push("Summary");

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Product Preview</SheetTitle>
          <SheetDescription>
            Review the imported data before saving
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {missingFields.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing required fields:</strong> {missingFields.join(", ")}
                <br />
                You'll need to add these before publishing.
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="font-semibold mb-2">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-right ml-4">{product.name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Short Name:</span>
                <span className="font-medium">{product.short_name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-medium">{product.sku || "Auto-generated"}</span>
              </div>
              {product.category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{product.category}</span>
                </div>
              )}
              {product.tags && product.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Media */}
          <div>
            <h3 className="font-semibold mb-2">Media</h3>
            {product.hero_thumbnail && (
              <img
                src={product.hero_thumbnail}
                alt="Hero"
                className="w-full rounded-lg mb-2"
              />
            )}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">YouTube ID:</span>
                <span className="font-medium">{product.youtube_id || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gallery Images:</span>
                <span className="font-medium">
                  {product.gallery_images?.length || 0} images
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div>
            <h3 className="font-semibold mb-2">Pricing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price:</span>
                <span className="font-medium text-lg text-primary">
                  {product.base_unit_price ? `${product.base_unit_price} ${product.currency || 'OMR'}` : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Order:</span>
                <span className="font-medium">{product.min_order_qty || "N/A"} units</span>
              </div>
              {product.pricing_tiers && product.pricing_tiers.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Price Tiers:</span>
                  <ul className="mt-1 space-y-1">
                    {product.pricing_tiers.map((tier: any, i: number) => (
                      <li key={i} className="text-xs">
                        {tier.minQty}+ units: {tier.unitPrice} {product.currency}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div>
            <h3 className="font-semibold mb-2">Content</h3>
            <div className="space-y-2 text-sm">
              {product.summary && (
                <div>
                  <span className="text-muted-foreground">Summary:</span>
                  <p className="text-sm mt-1">{product.summary}</p>
                </div>
              )}
              {product.highlight_bullets && product.highlight_bullets.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Highlights:</span>
                  <ul className="mt-1 space-y-1">
                    {product.highlight_bullets.map((bullet: string, i: number) => (
                      <li key={i} className="text-xs flex items-start">
                        <span className="mr-2">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Logistics */}
          {(product.weight_kg || product.lead_time_days || product.origin_country) && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Logistics</h3>
                <div className="space-y-2 text-sm">
                  {product.weight_kg && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-medium">{product.weight_kg} kg</span>
                    </div>
                  )}
                  {product.lead_time_days && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead Time:</span>
                      <span className="font-medium">{product.lead_time_days} days</span>
                    </div>
                  )}
                  {product.origin_country && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Origin:</span>
                      <span className="font-medium">{product.origin_country}</span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Supplier Info */}
          {product.supplier_data && (
            <div>
              <h3 className="font-semibold mb-2">Supplier Information</h3>
              <div className="space-y-2 text-sm">
                {product.supplier_data.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium">{product.supplier_data.name}</span>
                  </div>
                )}
                {product.supplier_data.rating && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium">{product.supplier_data.rating}/5</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={onSaveDraft} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button variant="outline" onClick={onEdit} className="flex-1">
              <Edit className="mr-2 h-4 w-4" />
              Edit in Form
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
