import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { Truck, Clock, DollarSign } from "lucide-react";

interface ShippingRate {
  carrier: string;
  service: string;
  cost: number;
  currency: string;
  transitDays: number;
  error?: string;
}

interface ShippingRatesDisplayProps {
  rates: ShippingRate[];
  loading: boolean;
  error?: string;
}

export const ShippingRatesDisplay = ({ rates, loading, error }: ShippingRatesDisplayProps) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('calculator.liveRates') || 'Live Shipping Rates'}</CardTitle>
          <CardDescription>{t('calculator.fetchingRates') || 'Fetching rates from carriers...'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t('calculator.ratesError') || 'Unable to Fetch Rates'}</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (rates.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {t('calculator.liveRates') || 'Live Shipping Rates'}
        </CardTitle>
        <CardDescription>
          {t('calculator.ratesDescription') || 'Real-time rates from major carriers'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rates.map((rate, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">{rate.carrier}</h4>
                  <Badge variant="secondary">{rate.service}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {rate.transitDays} {t('calculator.days') || 'days'}
                    </span>
                  </div>
                </div>
                {rate.error && (
                  <p className="text-sm text-destructive">{rate.error}</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-2xl font-bold">
                  <DollarSign className="h-5 w-5" />
                  <span>{rate.cost.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{rate.currency}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {t('calculator.ratesDisclaimer') || 'Rates are estimates and may vary. Contact carriers for final quotes.'}
        </p>
      </CardContent>
    </Card>
  );
};
