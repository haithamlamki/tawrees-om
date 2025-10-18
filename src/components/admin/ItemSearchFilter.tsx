import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShipmentItem } from "@/types/calculator";

interface ItemSearchFilterProps {
  items: ShipmentItem[];
  onFilteredItemsChange: (items: ShipmentItem[]) => void;
}

export function ItemSearchFilter({ items, onFilteredItemsChange }: ItemSearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [imageFilter, setImageFilter] = useState<"all" | "with-image" | "without-image">("all");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const applyFilters = (search: string, imgFilter: string) => {
    let filtered = [...items];

    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(item =>
        item.productName?.toLowerCase().includes(search.toLowerCase())
      );
      if (!activeFilters.includes('search')) {
        setActiveFilters([...activeFilters, 'search']);
      }
    } else {
      setActiveFilters(activeFilters.filter(f => f !== 'search'));
    }

    // Image filter
    if (imgFilter === "with-image") {
      filtered = filtered.filter(item => item.productImage);
      if (!activeFilters.includes('image')) {
        setActiveFilters([...activeFilters.filter(f => f !== 'image'), 'image']);
      }
    } else if (imgFilter === "without-image") {
      filtered = filtered.filter(item => !item.productImage);
      if (!activeFilters.includes('image')) {
        setActiveFilters([...activeFilters.filter(f => f !== 'image'), 'image']);
      }
    } else {
      setActiveFilters(activeFilters.filter(f => f !== 'image'));
    }

    onFilteredItemsChange(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    applyFilters(value, imageFilter);
  };

  const handleImageFilterChange = (value: string) => {
    setImageFilter(value as any);
    applyFilters(searchTerm, value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setImageFilter("all");
    setActiveFilters([]);
    onFilteredItemsChange(items);
  };

  const hasActiveFilters = searchTerm || imageFilter !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Image Filter */}
        <Select value={imageFilter} onValueChange={handleImageFilterChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by image" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="with-image">With Images</SelectItem>
            <SelectItem value="without-image">Without Images</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="text-xs">
              Search: "{searchTerm}"
            </Badge>
          )}
          {imageFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {imageFilter === "with-image" ? "With images" : "Without images"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
