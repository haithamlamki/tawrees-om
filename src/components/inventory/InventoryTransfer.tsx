import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InventoryTransferProps {
  inventoryId: string;
  currentQuantity: number;
  currentLocation: string | null;
  productName: string;
  onTransferComplete: () => void;
}

// Using any type since wms_inventory table types haven't been regenerated yet

export const InventoryTransfer = ({
  inventoryId,
  currentQuantity,
  currentLocation,
  productName,
  onTransferComplete,
}: InventoryTransferProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async () => {
    const transferQty = Number(quantity);
    
    if (!transferQty || transferQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (transferQty > currentQuantity) {
      toast.error("Transfer quantity exceeds available stock");
      return;
    }

    if (!newLocation.trim()) {
      toast.error("Please enter a new location");
      return;
    }

    setIsLoading(true);

    try {
      // Fetch current item
      const { data: items, error: fetchError } = await supabase
        .from('wms_inventory')
        .select('*')
        .eq('id', inventoryId);

      if (fetchError) throw fetchError;
      if (!items || items.length === 0) throw new Error("Inventory item not found");
      
      const currentItem: any = items[0];
      const remainingQty = currentQuantity - transferQty;
      
      // Update or delete current location item
      if (remainingQty === 0) {
        const { error: deleteError } = await supabase
          .from('wms_inventory')
          .delete()
          .eq('id', inventoryId);
        if (deleteError) throw deleteError;
      } else {
        const { error: updateError } = await supabase
          .from('wms_inventory')
          .update({ quantity: remainingQty })
          .eq('id', inventoryId);
        if (updateError) throw updateError;
      }

      // Check if item exists at new location - using explicit type casting to avoid TS recursion
      const checkQuery: any = supabase.from('wms_inventory').select('*');
      const checkResult = await checkQuery
        .eq('customer_id', currentItem.customer_id)
        .eq('sku', currentItem.sku)
        .eq('location', newLocation);
      
      const existing = checkResult.data;
      const checkError = checkResult.error;

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        // Update existing item at new location
        const existingItem: any = existing[0];
        const { error: updateError } = await supabase
          .from('wms_inventory')
          .update({ 
            quantity: existingItem.quantity + transferQty,
          })
          .eq('id', existingItem.id);
        if (updateError) throw updateError;
      } else {
        // Create new item at new location
        const { error: insertError } = await supabase
          .from('wms_inventory')
          .insert({
            customer_id: currentItem.customer_id,
            product_name: currentItem.product_name,
            sku: currentItem.sku,
            quantity: transferQty,
            unit: currentItem.unit,
            location: newLocation,
            notes: notes || null,
            status: 'available',
          });
        if (insertError) throw insertError;
      }

      toast.success(`Transferred ${transferQty} units to ${newLocation}`);
      setIsOpen(false);
      setQuantity("");
      setNewLocation("");
      setNotes("");
      onTransferComplete();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || "Failed to transfer inventory");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Inventory</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Product</Label>
            <p className="text-sm font-medium mt-1">{productName}</p>
          </div>

          <div>
            <Label>Current Location</Label>
            <p className="text-sm text-muted-foreground mt-1">{currentLocation || "No location set"}</p>
          </div>

          <div>
            <Label>Available Quantity</Label>
            <p className="text-sm font-medium mt-1">{currentQuantity}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-quantity">Transfer Quantity *</Label>
            <Input
              id="transfer-quantity"
              type="number"
              min="1"
              max={currentQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity to transfer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-location">New Location *</Label>
            <Input
              id="new-location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g., Warehouse B - Rack 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-notes">Notes</Label>
            <Textarea
              id="transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add transfer notes (optional)"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTransfer}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Transferring..." : "Transfer"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
