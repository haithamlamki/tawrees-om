import { Card, CardContent } from "@/components/ui/card";
import { Package, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContainerCardProps {
  name: string;
  dimensions: string;
  capacity: number;
  selected: boolean;
  onClick: () => void;
}

export const ContainerCard = ({
  name,
  dimensions,
  capacity,
  selected,
  onClick,
}: ContainerCardProps) => {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "border-primary border-2 bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{dimensions}</p>
              <p className="text-sm text-muted-foreground">Capacity: {capacity} CBM</p>
            </div>
          </div>
          {selected && (
            <div className="bg-primary rounded-full p-1">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
