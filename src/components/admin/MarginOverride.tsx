import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";

interface MarginOverrideProps {
  quoteId: string;
  currentMargin?: number;
  onSuccess?: () => void;
}

export const MarginOverride = ({ quoteId, currentMargin, onSuccess }: MarginOverrideProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    margin_override_percentage: currentMargin?.toString() || "",
    margin_override_reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          margin_override_percentage: parseFloat(formData.margin_override_percentage),
          margin_override_reason: formData.margin_override_reason,
          margin_override_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Margin override applied successfully",
      });

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error applying margin override:", error);
      toast({
        title: "Error",
        description: "Failed to apply margin override",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Override Margin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override Profit Margin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="margin">New Margin (%)</Label>
            <Input
              id="margin"
              type="number"
              step="0.01"
              value={formData.margin_override_percentage}
              onChange={(e) =>
                setFormData({ ...formData, margin_override_percentage: e.target.value })
              }
              placeholder="15.00"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current margin: {currentMargin?.toFixed(2)}%
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Override</Label>
            <Textarea
              id="reason"
              value={formData.margin_override_reason}
              onChange={(e) =>
                setFormData({ ...formData, margin_override_reason: e.target.value })
              }
              placeholder="Explain why this margin override is necessary..."
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Apply Override
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
