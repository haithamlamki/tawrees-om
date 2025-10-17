import { ShipmentItem } from "@/types/calculator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ItemRowProps {
  item: ShipmentItem;
  onUpdate: (id: string, field: keyof ShipmentItem, value: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const ItemRow = ({ item, onUpdate, onRemove, canRemove }: ItemRowProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item.productImage || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      onUpdate(item.id, "productImage", base64String);
      toast.success("Image uploaded successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to upload image");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    onUpdate(item.id, "productImage", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
      {/* Product Info Row (Optional) */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-6">
          <label className="text-xs text-muted-foreground mb-1 block">Product Name (Optional)</label>
          <Input
            type="text"
            value={item.productName || ""}
            onChange={(e) => onUpdate(item.id, "productName", e.target.value)}
            placeholder="e.g., Laptop, T-Shirts, etc."
          />
        </div>
        <div className="col-span-6">
          <label className="text-xs text-muted-foreground mb-1 block">Product Image (Optional)</label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {!imagePreview ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <div className="relative w-12 h-12 border rounded overflow-hidden flex-shrink-0">
                  <img 
                    src={imagePreview} 
                    alt="Product preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dimensions Row */}
      <div className="grid grid-cols-12 gap-2 items-end">
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
    </div>
  );
};

export default ItemRow;
