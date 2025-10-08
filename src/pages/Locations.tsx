import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Search } from "lucide-react";
import type { Origin, Destination } from "@/types/locations";

const COUNTRIES = [
  { code: "CN", name: "China" },
  { code: "OM", name: "Oman" },
  { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KW", name: "Kuwait" },
  { code: "QA", name: "Qatar" },
];

export default function Locations() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchOrigin, setSearchOrigin] = useState("");
  const [searchDestination, setSearchDestination] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<"origin" | "destination" | null>(null);
  const [editItem, setEditItem] = useState<Origin | Destination | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    country: "CN",
    is_port: false,
    active: true,
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
    const [originsRes, destinationsRes] = await Promise.all([
      supabase.from("origins").select("*").order("name"),
      supabase.from("destinations").select("*").order("name"),
    ]);

    if (originsRes.data) setOrigins(originsRes.data);
    if (destinationsRes.data) setDestinations(destinationsRes.data);
  };

  const handleEdit = (type: "origin" | "destination", item: Origin | Destination) => {
    setEditMode(type);
    setEditItem(item);
    setFormData({
      name: item.name,
      country: item.country,
      is_port: "is_port" in item ? item.is_port : false,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const handleAdd = (type: "origin" | "destination") => {
    setEditMode(type);
    setEditItem(null);
    setFormData({
      name: "",
      country: type === "origin" ? "CN" : "OM",
      is_port: false,
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const table = editMode === "origin" ? "origins" : "destinations";
    const data = editMode === "origin"
      ? formData
      : { name: formData.name, country: formData.country, active: formData.active };

    if (editItem) {
      const { error } = await supabase.from(table).update(data).eq("id", editItem.id);
      if (error) {
        toast.error(`Failed to update: ${error.message}`);
        return;
      }
      toast.success(`${editMode} updated successfully`);
    } else {
      const { error } = await supabase.from(table).insert(data);
      if (error) {
        toast.error(`Failed to add: ${error.message}`);
        return;
      }
      toast.success(`${editMode} added successfully`);
    }

    setDialogOpen(false);
    loadData();
  };

  const filteredOrigins = origins.filter((o) =>
    o.name.toLowerCase().includes(searchOrigin.toLowerCase())
  );
  const filteredDestinations = destinations.filter((d) =>
    d.name.toLowerCase().includes(searchDestination.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Locations Management</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Origins */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Origins (China)</CardTitle>
              <Button onClick={() => handleAdd("origin")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Origin
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search origins..."
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrigins.map((origin) => (
                    <TableRow key={origin.id}>
                      <TableCell>{origin.name}</TableCell>
                      <TableCell>{origin.is_port ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <span className={origin.active ? "text-green-600" : "text-red-600"}>
                          {origin.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit("origin", origin)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Destinations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Destinations</CardTitle>
              <Button onClick={() => handleAdd("destination")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Destination
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search destinations..."
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDestinations.map((dest) => (
                    <TableRow key={dest.id}>
                      <TableCell>{dest.name}</TableCell>
                      <TableCell>
                        {COUNTRIES.find((c) => c.code === dest.country)?.name}
                      </TableCell>
                      <TableCell>
                        <span className={dest.active ? "text-green-600" : "text-red-600"}>
                          {dest.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit("destination", dest)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit" : "Add"} {editMode}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {editMode === "destination" && (
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editMode === "origin" && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_port"
                    checked={formData.is_port}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_port: checked })
                    }
                  />
                  <Label htmlFor="is_port">Is Port</Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editItem ? "Update" : "Add"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
