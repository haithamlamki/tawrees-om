import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Phone, Mail, MapPin } from "lucide-react";

interface ShippingPartnerDetailsProps {
  partnerName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  trackingNumber: string;
}

export function ShippingPartnerDetails({
  partnerName,
  contactPerson,
  phone,
  email,
  address,
  status,
  trackingNumber,
}: ShippingPartnerDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_partner_acceptance":
        return "warning";
      case "in_transit":
        return "default";
      case "delivered":
        return "success";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Shipping Partner Information</CardTitle>
          <Badge variant={getStatusColor(status) as any}>
            {status.replace(/_/g, " ").toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Company</p>
            <p className="font-medium">{partnerName}</p>
          </div>
        </div>

        {contactPerson && (
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{contactPerson}</p>
            </div>
          </div>
        )}

        {phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <a href={`tel:${phone}`} className="font-medium hover:underline">
                {phone}
              </a>
            </div>
          </div>
        )}

        {email && (
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a href={`mailto:${email}`} className="font-medium hover:underline">
                {email}
              </a>
            </div>
          </div>
        )}

        {address && (
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{address}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">Tracking Number</p>
          <p className="font-mono font-medium text-lg">{trackingNumber}</p>
        </div>
      </CardContent>
    </Card>
  );
}
