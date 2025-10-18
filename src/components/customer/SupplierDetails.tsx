import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Phone, Mail, MapPin, FileText } from "lucide-react";

interface SupplierDetailsProps {
  supplierName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  supplierCode?: string | null;
  supplierNotes?: string | null;
}

export function SupplierDetails({
  supplierName,
  contactPerson,
  phone,
  email,
  address,
  city,
  country,
  supplierCode,
  supplierNotes,
}: SupplierDetailsProps) {
  const fullAddress = [address, city, country].filter(Boolean).join(", ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Supplier Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Company</p>
            <p className="font-medium">{supplierName}</p>
            {supplierCode && (
              <p className="text-xs text-muted-foreground">Code: {supplierCode}</p>
            )}
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

        {fullAddress && (
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{fullAddress}</p>
            </div>
          </div>
        )}

        {supplierNotes && (
          <div className="pt-4 border-t">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Supplier Notes</p>
                <p className="text-sm">{supplierNotes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}