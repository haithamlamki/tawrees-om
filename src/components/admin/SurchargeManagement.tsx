import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Surcharge, SURCHARGE_TYPE_LABELS } from "@/types/surcharges";
import { Origin, Destination } from "@/types/locations";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export const SurchargeManagement = () => {
  const { toast } = useToast();
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "fuel" as keyof typeof SURCHARGE_TYPE_LABELS,
    amount: "",
    is_percentage: false,
    origin_id: "",
    destination_id: "",
    rate_type: "",
    valid_from: new Date(),
    valid_to: undefined as Date | undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [surchargesRes, originsRes, destinationsRes] = await Promise.all([
        supabase.from("surcharges").select("*").order("created_at", { ascending: false }),
        supabase.from("origins").select("*").eq("active", true),
        supabase.from("destinations").select("*").eq("active", true),
      ]);

      if (surchargesRes.error) throw surchargesRes.error;
      if (originsRes.error) throw originsRes.error;
      if (destinationsRes.error) throw destinationsRes.error;

      setSurcharges(surchargesRes.data || []);
      setOrigins(originsRes.data || []);
      setDestinations(destinationsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load surcharges data",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const insertData: any = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        is_percentage: formData.is_percentage,
        valid_from: formData.valid_from.toISOString(),
      };

      if (formData.name) insertData.name = formData.name;
      if (formData.origin_id) insertData.origin_id = formData.origin_id;
      if (formData.destination_id) insertData.destination_id = formData.destination_id;
      if (formData.rate_type) insertData.rate_type = formData.rate_type;
      if (formData.valid_to) insertData.valid_to = formData.valid_to.toISOString();

      const { error } = await supabase.from("surcharges").insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Surcharge created successfully",
      });

      setFormData({
        name: "",
        type: "fuel",
        amount: "",
        is_percentage: false,
        origin_id: "",
        destination_id: "",
        rate_type: "",
        valid_from: new Date(),
        valid_to: undefined,
      });

      loadData();
    } catch (error) {
      console.error("Error creating surcharge:", error);
      toast({
        title: "Error",
        description: "Failed to create surcharge",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("surcharges")
        .update({ active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Surcharge ${!currentActive ? "activated" : "deactivated"}`,
      });

      loadData();
    } catch (error) {
      console.error("Error updating surcharge:", error);
      toast({
        title: "Error",
        description: "Failed to update surcharge",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Surcharge</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Surcharge Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Peak Season Fuel"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SURCHARGE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="100.00"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_percentage"
                  checked={formData.is_percentage}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_percentage: checked })
                  }
                />
                <Label htmlFor="is_percentage">Percentage-based</Label>
              </div>

              <div>
                <Label htmlFor="origin">Origin (Optional)</Label>
                <Select
                  value={formData.origin_id}
                  onValueChange={(value) => setFormData({ ...formData, origin_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All origins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All origins</SelectItem>
                    {origins.map((origin) => (
                      <SelectItem key={origin.id} value={origin.id}>
                        {origin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="destination">Destination (Optional)</Label>
                <Select
                  value={formData.destination_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destination_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All destinations</SelectItem>
                    {destinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}, {dest.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Surcharge
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Surcharges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {surcharges.map((surcharge) => (
              <div
                key={surcharge.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-semibold">{surcharge.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {SURCHARGE_TYPE_LABELS[surcharge.type as keyof typeof SURCHARGE_TYPE_LABELS]} •{" "}
                    {surcharge.is_percentage ? `${surcharge.amount}%` : `$${surcharge.amount}`}
                  </div>
                </div>
                <Switch
                  checked={surcharge.active}
                  onCheckedChange={() => toggleActive(surcharge.id, surcharge.active)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
