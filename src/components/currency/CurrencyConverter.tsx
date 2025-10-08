import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع." },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
];

// Mock exchange rates (in production, fetch from an API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.24,
  AED: 3.67,
  SAR: 3.75,
  OMR: 0.38,
  EGP: 30.90,
};

interface CurrencyConverterProps {
  amount: number;
  fromCurrency: string;
  onConvert?: (amount: number, toCurrency: string) => void;
}

export const CurrencyConverter = ({ amount, fromCurrency, onConvert }: CurrencyConverterProps) => {
  const [toCurrency, setToCurrency] = useState("USD");
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    convertCurrency();
  }, [amount, fromCurrency, toCurrency]);

  const convertCurrency = () => {
    const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
    const toRate = EXCHANGE_RATES[toCurrency] || 1;
    const result = (amount / fromRate) * toRate;
    setConvertedAmount(result);
    
    if (onConvert) {
      onConvert(result, toCurrency);
    }
  };

  const refreshRates = () => {
    // In production, fetch latest rates from API
    setLastUpdated(new Date());
    convertCurrency();
    toast.success("Exchange rates updated");
  };

  const formatCurrency = (value: number, currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    return `${currency?.symbol || ""}${value.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Converter
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshRates}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2 items-center">
              <Select value={fromCurrency} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(amount, fromCurrency)}
            </div>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-lg font-semibold text-primary">
              {formatCurrency(convertedAmount, toCurrency)}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Exchange rate: 1 {fromCurrency} = {(EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency]).toFixed(4)} {toCurrency}
          <br />
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

interface MultiCurrencyPricingProps {
  basePrice: number;
  baseCurrency: string;
}

export const MultiCurrencyPricing = ({ basePrice, baseCurrency }: MultiCurrencyPricingProps) => {
  return (
    <div className="space-y-2">
      <Label>Price in different currencies:</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {CURRENCIES.map((currency) => {
          const rate = EXCHANGE_RATES[currency.code] / EXCHANGE_RATES[baseCurrency];
          const convertedPrice = basePrice * rate;
          return (
            <div
              key={currency.code}
              className="p-2 border rounded-lg text-center"
            >
              <div className="text-xs text-muted-foreground">{currency.code}</div>
              <div className="font-semibold">
                {currency.symbol}{convertedPrice.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};