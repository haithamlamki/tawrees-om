import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const WhatsAppButton = ({ 
  phoneNumber, 
  message = "", 
  variant = "outline",
  size = "default"
}: WhatsAppButtonProps) => {
  const handleWhatsAppClick = () => {
    // Format phone number (remove spaces, dashes, etc.)
    const formattedPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Encode message
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}${message ? `?text=${encodedMessage}` : ''}`;
    
    // Open in new window
    window.open(whatsappUrl, '_blank');
    
    toast.success("Opening WhatsApp...");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsAppClick}
      className="gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp
    </Button>
  );
};
