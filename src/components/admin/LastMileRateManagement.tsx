import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LastMileRate {
  id: string;
  destination_id?: string;
  city?: string;
  base_fee: number;
  per_cbm_fee: number;
  per_kg_fee: number;
  active: boolean;
  valid_from: string;
  valid_to?: string;
}

interface Destination {
  id: string;
  name: string;
  country: string;
}

export const LastMileRateManagement = () => {
  const { toast } = useToast();
  const [rates, setRates] = useState<LastMileRate[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<LastMileRate | null>(null);
  const [formData, setFormData] = useState({
    destination_id: "",
    city: "",
    base_fee: "",
    per_cbm_fee: "",
    per_kg_fee: "",
    active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ratesRes, destsRes] = await Promise.all([
        supabase.from("last_mile_rates").select("*").order("created_at", { ascending: false }),
        supabase.from("destinations").select("id, name, country").eq("active", true),
      ]);

      if (ratesRes.error) throw ratesRes.error;
      if (destsRes.error) throw destsRes.error;

      setRates(ratesRes.data || []);
      setDestinations(destsRes.data || []);
    } catch (error) {
      console.error("Error loading last mile rates:", error);
      toast({
        title: "Error",
        description: "Failed to load last mile rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rateData = {
        destination_id: formData.destination_id || null,
        city: formData.city || null,
        base_fee: parseFloat(formData.base_fee),
        per_cbm_fee: parseFloat(formData.per_cbm_fee || "0"),
        per_kg_fee: parseFloat(formData.per_kg_fee || "0"),
        active: formData.active,
      };

      if (editingRate) {
        const { error } = await supabase
          .from("last_mile_rates")
          .update(rateData)
          .eq("id", editingRate.id);
        if (error) throw error;
        toast({ title: "Success", description: "Last mile rate updated" });
      } else {
        const { error } = await supabase.from("last_mile_rates").insert([rateData]);
        if (error) throw error;
        toast({ title: "Success", description: "Last mile rate created" });
      }

      setOpen(false);
      setEditingRate(null);
      setFormData({
        destination_id: "",
        city: "",
        base_fee: "",
        per_cbm_fee: "",
        per_kg_fee: "",
        active: true,
      });
      loadData();
    } catch (error) {
      console.error("Error saving last mile rate:", error);
      toast({
        title: "Error",
        description: "Failed to save last mile rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rate?")) return;

    try {
      const { error } = await supabase.from("last_mile_rates").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Last mile rate deleted" });
      loadData();
    } catch (error) {
      console.error("Error deleting last mile rate:", error);
      toast({
        title: "Error",
        description: "Failed to delete last mile rate",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (rate: LastMileRate) => {
    setEditingRate(rate);
    setFormData({
      destination_id: rate.destination_id || "",
      city: rate.city || "",
      base_fee: rate.base_fee.toString(),
      per_cbm_fee: rate.per_cbm_fee.toString(),
      per_kg_fee: rate.per_kg_fee.toString(),
      active: rate.active,
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Last Mile Delivery Rates</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingRate(null);
              setFormData({
                destination_id: "",
                city: "",
                base_fee: "",
                per_cbm_fee: "",
                per_kg_fee: "",
                active: true,
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRate ? "Edit" : "Add"} Last Mile Rate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Select
                  value={formData.destination_id}
                  onValueChange={(value) => setFormData({ ...formData, destination_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {destinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}, {dest.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="city">Specific City (optional)</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Lagos, Abuja"
                />
              </div>

              <div>
                <Label htmlFor="base_fee">Base Fee (₦)</Label>
                <Input
                  id="base_fee"
                  type="number"
                  step="0.01"
                  value={formData.base_fee}
                  onChange={(e) => setFormData({ ...formData, base_fee: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="per_cbm_fee">Per CBM Fee (₦)</Label>
                <Input
                  id="per_cbm_fee"
                  type="number"
                  step="0.01"
                  value={formData.per_cbm_fee}
                  onChange={(e) => setFormData({ ...formData, per_cbm_fee: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="per_kg_fee">Per KG Fee (₦)</Label>
                <Input
                  id="per_kg_fee"
                  type="number"
                  step="0.01"
                  value={formData.per_kg_fee}
                  onChange={(e) => setFormData({ ...formData, per_kg_fee: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingRate ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading && rates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Loading rates...</div>
        ) : rates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No last mile rates configured</div>
        ) : (
          <div className="space-y-2">
            {rates.map((rate) => {
              const dest = destinations.find((d) => d.id === rate.destination_id);
              return (
                <div
                  key={rate.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {dest ? `${dest.name}, ${dest.country}` : "All Destinations"}
                      {rate.city && ` - ${rate.city}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Base: ₦{rate.base_fee.toFixed(2)}
                      {rate.per_cbm_fee > 0 && ` + ₦${rate.per_cbm_fee}/CBM`}
                      {rate.per_kg_fee > 0 && ` + ₦${rate.per_kg_fee}/KG`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(rate)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(rate.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
