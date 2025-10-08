import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  shipping_partner_id: string | null;
  profiles: {
    full_name: string;
    email: string | null;
  };
}

interface ShippingPartner {
  id: string;
  company_name: string;
}

const UserRoleManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [partners, setPartners] = useState<ShippingPartner[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch user roles (now references auth.users, not profiles)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      // Create a map for quick lookup (profiles.id matches user_id in both tables)
      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, { full_name: p.full_name, email: p.email }]) || []
      );

      // Manually join the data
      const usersData = rolesData?.map((role) => ({
        ...role,
        profiles: profilesMap.get(role.user_id) || { full_name: "Unknown", email: null },
      })) || [];

      setUsers(usersData as UserRole[]);

      const { data: partnersData, error: partnersError } = await supabase
        .from("shipping_partners")
        .select("id, company_name")
        .eq("is_active", true);

      if (partnersError) throw partnersError;
      setPartners(partnersData || []);
    } catch (error: any) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error("Please select a user and role");
      return;
    }

    try {
      const insertData: any = {
        user_id: selectedUser,
        role: newRole,
      };

      if (newRole === "shipping_partner" && selectedPartner) {
        insertData.shipping_partner_id = selectedPartner;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert(insertData);

      if (error) throw error;

      toast.success("Role added successfully");
      setSelectedUser(null);
      setNewRole("");
      setSelectedPartner(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add role");
      console.error(error);
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role removed successfully");
      await loadData();
    } catch (error: any) {
      toast.error("Failed to remove role");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueUsers = Array.from(
    new Map(users.map(u => [u.user_id, u])).values()
  );

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add Role to User
        </h3>
        
        <div className="grid gap-4 md:grid-cols-4">
          <Select value={selectedUser || ""} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {uniqueUsers.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.profiles?.full_name || user.profiles?.email || user.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="shipping_partner">Shipping Partner</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          {newRole === "shipping_partner" && (
            <Select value={selectedPartner || ""} onValueChange={setSelectedPartner}>
              <SelectTrigger>
                <SelectValue placeholder="Select partner company" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={addRole}>Add Role</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Partner</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((userRole) => (
            <TableRow key={userRole.id}>
              <TableCell>{userRole.profiles?.full_name || "Unknown"}</TableCell>
              <TableCell>{userRole.profiles?.email || "N/A"}</TableCell>
              <TableCell>
                <Badge>{userRole.role}</Badge>
              </TableCell>
              <TableCell>
                {userRole.shipping_partner_id ? (
                  partners.find(p => p.id === userRole.shipping_partner_id)?.company_name || "N/A"
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRole(userRole.id)}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserRoleManagement;
