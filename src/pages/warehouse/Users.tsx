import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWMSCustomer } from "@/hooks/useWMSCustomer";
import { useWMSPermissions } from "@/hooks/useWMSPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { UserPlus, Trash2, Search } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function WMSUsers() {
  const { data: customer } = useWMSCustomer();
  const { data: permissions } = useWMSPermissions();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "employee",
    branch_id: ""
  });
  const [tempPassword, setTempPassword] = useState("");

  // Fetch customer users
  const { data: users, isLoading } = useQuery({
    queryKey: ["wms-customer-users", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customer_users")
        .select(`
          *,
          profiles!wms_customer_users_user_id_fkey (full_name, email, phone),
          wms_customer_branches!wms_customer_users_branch_id_fkey (branch_name)
        `)
        .eq("customer_id", customer!.id);

      if (error) throw error;
      return data;
    },
  });

  // Fetch branches for selection
  const { data: branches } = useQuery({
    queryKey: ["wms-branches", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customer_branches")
        .select("*")
        .eq("customer_id", customer!.id);

      if (error) throw error;
      return data;
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-wms-user', {
        body: {
          ...newUser,
          customer_id: customer!.id,
          branch_id: newUser.branch_id || null
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("User created successfully");
      setTempPassword(data.temporary_password);
      queryClient.invalidateQueries({ queryKey: ["wms-customer-users"] });
      setNewUser({ email: "", full_name: "", phone: "", role: "employee", branch_id: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("wms_customer_users")
        .delete()
        .eq("user_id", userId)
        .eq("customer_id", customer!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User removed successfully");
      queryClient.invalidateQueries({ queryKey: ["wms-customer-users"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove user");
    },
  });

  const filteredUsers = users?.filter((u: any) => {
    const profile = u.profiles;
    const searchLower = searchTerm.toLowerCase();
    return (
      profile?.full_name?.toLowerCase().includes(searchLower) ||
      profile?.email?.toLowerCase().includes(searchLower) ||
      u.role?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'employee': return 'outline';
      case 'accountant': return 'outline';
      default: return 'outline';
    }
  };

  if (!permissions?.canManageUsers) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            You don't have permission to manage users. Only customer owners and admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage employees, accountants, and access for your organization</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input
                  placeholder="+968 1234 5678"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissions?.isOwner && (
                      <SelectItem value="owner">Owner</SelectItem>
                    )}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {branches && branches.length > 0 && (newUser.role === 'employee' || newUser.role === 'accountant') && (
                <div className="space-y-2">
                  <Label>Branch Access</Label>
                  <Select value={newUser.branch_id} onValueChange={(value) => setNewUser({ ...newUser, branch_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Branches</SelectItem>
                      {branches.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Leave as "All Branches" for full access, or select a specific branch
                  </p>
                </div>
              )}
              {tempPassword && (
                <Alert>
                  <AlertDescription>
                    <div className="font-semibold mb-1">Temporary Password:</div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{tempPassword}</code>
                    <div className="text-sm mt-2">Please share this password securely with the user.</div>
                  </AlertDescription>
                </Alert>
              )}
              <Button 
                className="w-full" 
                onClick={() => createUserMutation.mutate()}
                disabled={createUserMutation.isPending || !newUser.email || !newUser.full_name}
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Users</CardTitle>
          <CardDescription>All users with access to your warehouse system</CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.profiles?.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.profiles?.email || 'N/A'}</TableCell>
                    <TableCell>{user.profiles?.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.wms_customer_branches?.branch_name ? (
                        <Badge variant="outline">{user.wms_customer_branches.branch_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">All Branches</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUserMutation.mutate(user.user_id)}
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}