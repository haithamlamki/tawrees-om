import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Warehouse, Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { usePartnerProfile, StorageLocation } from "@/hooks/usePartnerProfile";

interface PartnerStorageLocationsProps {
  partnerId: string;
}

export function PartnerStorageLocations({ partnerId }: PartnerStorageLocationsProps) {
  const { storageLocations, addLocation, removeLocation, isLoading } = usePartnerProfile(partnerId);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    try {
      await addLocation({
        name: newLocationName.trim(),
        address: newLocationAddress.trim(),
        is_default: storageLocations.length === 0,
      });
      
      setNewLocationName("");
      setNewLocationAddress("");
      setIsAdding(false);
      toast.success("Storage location added successfully");
    } catch (error) {
      console.error("Error adding location:", error);
      toast.error("Failed to add storage location");
    }
  };

  const handleRemoveLocation = async (locationId: string) => {
    try {
      await removeLocation(locationId);
      toast.success("Storage location removed successfully");
    } catch (error) {
      console.error("Error removing location:", error);
      toast.error("Failed to remove storage location");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Storage/Warehouse Locations
            </CardTitle>
            <CardDescription>
              Manage your storage and warehouse locations for shipment handling
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Locations */}
        {storageLocations.length > 0 ? (
          <div className="space-y-3">
            {storageLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{location.name}</p>
                      {location.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    {location.address && (
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveLocation(location.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No storage locations added yet</p>
              <p className="text-sm">Add your first location to get started</p>
            </div>
          )
        )}

        {/* Add New Location Form */}
        {isAdding && (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                placeholder="e.g., Main Warehouse, Storage Unit A"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-address">Address (Optional)</Label>
              <Input
                id="location-address"
                placeholder="e.g., Muscat Industrial Area"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewLocationName("");
                  setNewLocationAddress("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddLocation}>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

