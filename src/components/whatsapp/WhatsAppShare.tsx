import { Button } from "@/components/ui/button";
import { MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppShareProps {
  text: string;
  phoneNumber?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const WhatsAppShare = ({ 
  text, 
  phoneNumber, 
  variant = "outline",
  size = "default" 
}: WhatsAppShareProps) => {
  const shareViaWhatsApp = () => {
    try {
      const encodedText = encodeURIComponent(text);
      let url = `https://wa.me/`;
      
      if (phoneNumber) {
        // Remove any non-digit characters from phone number
        const cleanNumber = phoneNumber.replace(/\D/g, "");
        url += `${cleanNumber}?text=${encodedText}`;
      } else {
        url += `?text=${encodedText}`;
      }

      window.open(url, "_blank");
      toast.success("Opening WhatsApp...");
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast.error("Failed to open WhatsApp");
    }
  };

  return (
    <Button
      onClick={shareViaWhatsApp}
      variant={variant}
      size={size}
      className="gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      {size !== "icon" && "Share on WhatsApp"}
    </Button>
  );
};

interface ShareQuoteProps {
  quoteId: string;
  amount: number;
  currency: string;
  validUntil: string;
}

export const ShareQuoteViaWhatsApp = ({ quoteId, amount, currency, validUntil }: ShareQuoteProps) => {
  const message = `🚢 Tawreed Shipping Quote

Quote ID: ${quoteId}
Amount: ${currency} ${amount.toFixed(2)}
Valid Until: ${new Date(validUntil).toLocaleDateString()}

View your quote: ${window.location.origin}/quote/${quoteId}

Thank you for choosing Tawreed!`;

  return <WhatsAppShare text={message} />;
};

interface ShareInvoiceProps {
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paymentLink?: string;
}

export const ShareInvoiceViaWhatsApp = ({ 
  invoiceNumber, 
  amount, 
  dueDate,
  paymentLink 
}: ShareInvoiceProps) => {
  const message = `📄 Invoice from Tawreed

Invoice #: ${invoiceNumber}
Amount: ${amount.toFixed(2)}
Due Date: ${new Date(dueDate).toLocaleDateString()}

${paymentLink ? `Pay online: ${paymentLink}` : ""}

For any questions, please contact us.`;

  return <WhatsAppShare text={message} />;
};

interface ShareTrackingProps {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
}

export const ShareTrackingViaWhatsApp = ({ 
  trackingNumber, 
  status,
  estimatedDelivery 
}: ShareTrackingProps) => {
  const message = `📦 Shipment Update - Tawreed

Tracking #: ${trackingNumber}
Status: ${status}
${estimatedDelivery ? `Estimated Delivery: ${new Date(estimatedDelivery).toLocaleDateString()}` : ""}

Track your shipment: ${window.location.origin}/tracking/${trackingNumber}`;

  return <WhatsAppShare text={message} />;
};