import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Edit, Send } from "lucide-react";

interface InstantOfferModalProps {
  open: boolean;
  onClose: () => void;
  quote: any;
  onSendQuote: () => void;
  onEditDetails: () => void;
}

export default function InstantOfferModal({
  open,
  onClose,
  quote,
  onSendQuote,
  onEditDetails,
}: InstantOfferModalProps) {
  if (!quote) return null;

  const { product, unitPrice, subtotal, shippingFee, discount, discountAmount, total, eta, customerInfo } = quote;

  const handleWhatsApp = () => {
    const phone = product.whatsapp_number || "+96800000000"; // Default or from settings
    const message = `Hi! I'm interested in ${product.name}. I'd like to order ${customerInfo.quantity} units to ${customerInfo.deliveryCity}. Can you help?`;
    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    if (window.gtag) {
      window.gtag('event', 'whatsapp_click', {
        product_id: product.id,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Instant Offer for {product.short_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unit price:</span>
              <span className="font-medium">{unitPrice} {product.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{customerInfo.quantity} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">{subtotal} {product.currency}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Shipping to {customerInfo.deliveryCity}:
              </span>
              <span className="font-medium">{shippingFee} {product.currency}</span>
            </div>
            {eta && (
              <div className="text-xs text-muted-foreground">
                ETA: {eta} days
              </div>
            )}
          </div>

          {discount && discountAmount > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({discount}):</span>
                <span className="font-medium">-{discountAmount} {product.currency}</span>
              </div>
            </>
          )}

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total (estimated):</span>
            <span className="text-2xl font-bold text-primary">
              {total} {product.currency}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Valid for 7 days. Final total may vary after address verification.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onSendQuote} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Send Me the Quote
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onEditDetails}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
            <Button variant="outline" onClick={handleWhatsApp}>
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp Us
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
