import { ShipmentItem } from "@/types/calculator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ItemRowProps {
  item: ShipmentItem;
  onUpdate: (id: string, field: keyof ShipmentItem, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const ItemRow = ({ item, onUpdate, onRemove, canRemove }: ItemRowProps) => {
  return (
    <div className="grid grid-cols-12 gap-2 items-end bg-secondary/20 p-3 rounded-lg">
      {/* Dimensions */}
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground mb-1 block">Length</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.length || ""}
          onChange={(e) => onUpdate(item.id, "length", parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground mb-1 block">Width</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.width || ""}
          onChange={(e) => onUpdate(item.id, "width", parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground mb-1 block">Height</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.height || ""}
          onChange={(e) => onUpdate(item.id, "height", parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div className="col-span-1">
        <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
        <Select
          value={item.dimensionUnit}
          onValueChange={(value: any) => onUpdate(item.id, "dimensionUnit", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cm">cm</SelectItem>
            <SelectItem value="m">m</SelectItem>
            <SelectItem value="in">in</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Weight */}
      <div className="col-span-2">
        <label className="text-xs text-muted-foreground mb-1 block">Weight</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.weight || ""}
          onChange={(e) => onUpdate(item.id, "weight", parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div className="col-span-1">
        <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
        <Select
          value={item.weightUnit}
          onValueChange={(value: any) => onUpdate(item.id, "weightUnit", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="lb">lb</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="col-span-1">
        <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
        <Input
          type="number"
          min="1"
          value={item.quantity || 1}
          onChange={(e) => onUpdate(item.id, "quantity", parseInt(e.target.value) || 1)}
          placeholder="1"
        />
      </div>

      {/* Remove button */}
      <div className="col-span-1 flex items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          className="h-10 w-10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ItemRow;
