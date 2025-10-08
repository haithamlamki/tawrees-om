import { useState } from "react";
import { Product, ProductQuote } from "@/types/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import InstantOfferModal from "./InstantOfferModal";

interface QuoteRequestDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export default function QuoteRequestDrawer({ product, open, onClose }: QuoteRequestDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [computedQuote, setComputedQuote] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    quantity: product?.min_order_qty || 1,
    deliveryCity: "",
    deliveryCountry: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    preferredChannel: "email" as "email" | "whatsapp",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (formData.quantity < product.min_order_qty) {
      toast({
        title: "Invalid Quantity",
        description: `Minimum order quantity is ${product.min_order_qty} units`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call compute-product-quote edge function
      const { data, error } = await supabase.functions.invoke('compute-product-quote', {
        body: {
          productId: product.id,
          quantity: formData.quantity,
          deliveryCity: formData.deliveryCity,
          deliveryCountry: formData.deliveryCountry,
        },
      });

      if (error) throw error;

      setComputedQuote({
        ...data,
        product,
        customerInfo: formData,
      });
      setShowOffer(true);

      if (window.gtag) {
        window.gtag('event', 'quote_instant_computed', {
          product_id: product.id,
          quantity: formData.quantity,
          total: data.total,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to compute quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-product-quote', {
        body: {
          ...computedQuote,
          customerInfo: formData,
        },
      });

      if (error) throw error;

      toast({
        title: "Quote Sent!",
        description: `Your quote (${data.quoteId}) has been sent to ${formData.preferredChannel === 'email' ? formData.customerEmail : 'WhatsApp'}`,
      });

      if (window.gtag) {
        window.gtag('event', 'quote_sent_ok', {
          quote_id: data.quoteId,
          channel: formData.preferredChannel,
        });
      }

      setShowOffer(false);
      onClose();
      setFormData({
        quantity: product?.min_order_qty || 1,
        deliveryCity: "",
        deliveryCountry: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        preferredChannel: "email",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send quote",
        variant: "destructive",
      });
    }
  };

  if (!product) return null;

  return (
    <>
      <Sheet open={open && !showOffer} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Request Quote</SheetTitle>
            <SheetDescription>
              {product.name}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div>
              <Label htmlFor="quantity">Quantity (Min: {product.min_order_qty})</Label>
              <Input
                id="quantity"
                type="number"
                min={product.min_order_qty}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryCity">Delivery City</Label>
                <Input
                  id="deliveryCity"
                  value={formData.deliveryCity}
                  onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliveryCountry">Country</Label>
                <Input
                  id="deliveryCountry"
                  value={formData.deliveryCountry}
                  onChange={(e) => setFormData({ ...formData, deliveryCountry: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customerName">Your Name</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">Phone (Optional)</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>

            <div>
              <Label>Preferred Contact Channel</Label>
              <RadioGroup
                value={formData.preferredChannel}
                onValueChange={(value: "email" | "whatsapp") =>
                  setFormData({ ...formData, preferredChannel: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="whatsapp" id="whatsapp" />
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              No payment required now—you'll receive an official quote first.
            </p>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get Instant Quote
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <InstantOfferModal
        open={showOffer}
        onClose={() => setShowOffer(false)}
        quote={computedQuote}
        onSendQuote={handleSendQuote}
        onEditDetails={() => setShowOffer(false)}
      />
    </>
  );
}
