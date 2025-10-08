import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Origin, Destination, Agreement, RateType } from "@/types/locations";
import { RATE_TYPE_LABELS } from "@/types/locations";

export default function Rates() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [formData, setFormData] = useState({
    origin_id: "",
    destination_id: "",
    rate_type: "" as RateType | "",
    buy_price: "",
    sell_price: "",
    margin_percent: "",
    min_charge: "",
    valid_from: new Date(),
    valid_to: null as Date | null,
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const loadData = async () => {
    const [originsRes, destinationsRes, agreementsRes] = await Promise.all([
      supabase.from("origins").select("*").eq("active", true).order("name"),
      supabase.from("destinations").select("*").eq("active", true).order("name"),
      supabase
        .from("agreements")
        .select(`*, origins(*), destinations(*)`)
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (originsRes.data) setOrigins(originsRes.data);
    if (destinationsRes.data) setDestinations(destinationsRes.data);
    if (agreementsRes.data) setAgreements(agreementsRes.data as Agreement[]);
  };

  const calculateSellPrice = (buy: number, margin: number) => {
    return buy * (1 + margin / 100);
  };

  const calculateMargin = (buy: number, sell: number) => {
    return ((sell - buy) / buy) * 100;
  };

  const handleBuyPriceChange = (value: string) => {
    setFormData({ ...formData, buy_price: value });
    if (value && formData.margin_percent) {
      const sell = calculateSellPrice(parseFloat(value), parseFloat(formData.margin_percent));
      setFormData((prev) => ({ ...prev, buy_price: value, sell_price: sell.toFixed(2) }));
    }
  };

  const handleMarginChange = (value: string) => {
    setFormData({ ...formData, margin_percent: value });
    if (value && formData.buy_price) {
      const sell = calculateSellPrice(parseFloat(formData.buy_price), parseFloat(value));
      setFormData((prev) => ({ ...prev, margin_percent: value, sell_price: sell.toFixed(2) }));
    }
  };

  const handleSellPriceChange = (value: string) => {
    setFormData({ ...formData, sell_price: value });
    if (value && formData.buy_price) {
      const margin = calculateMargin(parseFloat(formData.buy_price), parseFloat(value));
      setFormData((prev) => ({ ...prev, sell_price: value, margin_percent: margin.toFixed(2) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.rate_type || !formData.origin_id || !formData.destination_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("agreements").insert({
      origin_id: formData.origin_id,
      destination_id: formData.destination_id,
      rate_type: formData.rate_type,
      buy_price: parseFloat(formData.buy_price),
      sell_price: parseFloat(formData.sell_price),
      margin_percent: parseFloat(formData.margin_percent),
      min_charge: formData.min_charge ? parseFloat(formData.min_charge) : null,
      valid_from: formData.valid_from.toISOString(),
      valid_to: formData.valid_to?.toISOString() || null,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error(`Failed to create agreement: ${error.message}`);
      return;
    }

    toast.success("Agreement created successfully");
    loadData();
    // Reset form
    setFormData({
      origin_id: "",
      destination_id: "",
      rate_type: "",
      buy_price: "",
      sell_price: "",
      margin_percent: "",
      min_charge: "",
      valid_from: new Date(),
      valid_to: null,
      notes: "",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Agreements & Rates Management</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Update Rates Form */}
          <Card>
            <CardHeader>
              <CardTitle>Update Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="rate_type">Rate Type</Label>
                  <Select
                    value={formData.rate_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rate_type: value as RateType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RATE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin">Origin (China)</Label>
                    <Select
                      value={formData.origin_id}
                      onValueChange={(value) => setFormData({ ...formData, origin_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {origins.map((origin) => (
                          <SelectItem key={origin.id} value={origin.id}>
                            {origin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="destination">Destination</Label>
                    <Select
                      value={formData.destination_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, destination_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="buy_price">Buy Price (USD)</Label>
                  <Input
                    id="buy_price"
                    type="number"
                    step="0.01"
                    value={formData.buy_price}
                    onChange={(e) => handleBuyPriceChange(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="margin">Margin %</Label>
                    <Input
                      id="margin"
                      type="number"
                      step="0.01"
                      value={formData.margin_percent}
                      onChange={(e) => handleMarginChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="sell_price">Sell Price (USD)</Label>
                    <Input
                      id="sell_price"
                      type="number"
                      step="0.01"
                      value={formData.sell_price}
                      onChange={(e) => handleSellPriceChange(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="min_charge">Min Charge (Optional)</Label>
                  <Input
                    id="min_charge"
                    type="number"
                    step="0.01"
                    value={formData.min_charge}
                    onChange={(e) =>
                      setFormData({ ...formData, min_charge: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valid From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.valid_from, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.valid_from}
                          onSelect={(date) =>
                            date && setFormData({ ...formData, valid_from: date })
                          }
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Valid To (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.valid_to ? format(formData.valid_to, "PPP") : "No expiry"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.valid_to || undefined}
                          onSelect={(date) => setFormData({ ...formData, valid_to: date || null })}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save Agreement
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Rates List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agreements.map((agreement) => {
                  const profit = agreement.sell_price - agreement.buy_price;
                  const isExpired = agreement.valid_to
                    ? new Date(agreement.valid_to) < new Date()
                    : false;

                  return (
                    <Card key={agreement.id} className={isExpired ? "opacity-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">
                              {agreement.origins?.name} → {agreement.destinations?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {RATE_TYPE_LABELS[agreement.rate_type]}
                            </p>
                          </div>
                          {isExpired && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                              Expired
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Buy Price</p>
                            <p className="font-medium">${agreement.buy_price.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sell Price</p>
                            <p className="font-medium">${agreement.sell_price.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              profit > 0 ? "text-green-600" : "text-gray-600"
                            )}
                          >
                            Profit: ${profit.toFixed(2)} ({agreement.margin_percent.toFixed(1)}%)
                          </span>
                        </div>

                        {agreement.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{agreement.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
