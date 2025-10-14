import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { UserPlus, Search, Trash2, Mail, Plus } from "lucide-react";
import type { WMSCustomer } from "@/types/wms";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WMSCustomerUser {
  id: string;
  user_id: string;
  customer_id: string;
  branch_id: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  wms_customers: {
    company_name: string;
    customer_code: string;
  };
  wms_customer_branches: {
    branch_name: string;
  } | null;
}

export default function WMSUsers() {
  const { t } = useTranslation("admin");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserCustomer, setNewUserCustomer] = useState("");
  const [newUserBranch, setNewUserBranch] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Fetch all WMS customer users with details
  const { data: customerUsers, isLoading } = useQuery({
    queryKey: ["wms-customer-users"],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from("wms_customer_users")
        .select(`
          *,
          wms_customers (company_name, customer_code),
          wms_customer_branches (branch_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profile data for each user
      const enrichedUsers = await Promise.all(
        (users || []).map(async (user) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.user_id)
            .single();

          return {
            ...user,
            profiles: profile || { full_name: "", email: "" },
          };
        })
      );

      return enrichedUsers as WMSCustomerUser[];
    },
  });

  // Fetch all users (for assignment)
  const { data: allUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["wms-customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customers")
        .select("id, company_name, customer_code")
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      return data as WMSCustomer[];
    },
  });

  // Fetch branches for selected customer
  const { data: branches } = useQuery({
    queryKey: ["wms-branches", selectedCustomer],
    enabled: !!selectedCustomer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wms_customer_branches")
        .select("id, branch_name")
        .eq("customer_id", selectedCustomer)
        .order("branch_name");

      if (error) throw error;
      return data;
    },
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("wms_customer_users")
        .insert({
          user_id: selectedUser,
          customer_id: selectedCustomer,
          branch_id: selectedBranch || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-customer-users"] });
      toast({
        title: "Success",
        description: "User assigned to customer successfully",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("wms_customer_users")
        .delete()
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wms-customer-users"] });
      toast({
        title: "Success",
        description: "User removed from customer",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedUser("");
    setSelectedCustomer("");
    setSelectedBranch("");
  };

  const resetCreateForm = () => {
    setNewUserEmail("");
    setNewUserName("");
    setNewUserPhone("");
    setNewUserCustomer("");
    setNewUserBranch("");
    setCreatedPassword(null);
  };

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-wms-contract-user', {
        body: {
          email: newUserEmail,
          full_name: newUserName,
          phone: newUserPhone,
          customer_id: newUserCustomer,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create user');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wms-customer-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      
      if (data.temporary_password) {
        setCreatedPassword(data.temporary_password);
        toast({
          title: "Success",
          description: "User created successfully. Please save the temporary password.",
        });
      } else {
        toast({
          title: "Success",
          description: data.message || "User linked successfully",
        });
        setIsCreateDialogOpen(false);
        resetCreateForm();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignUser = () => {
    if (!selectedUser || !selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select both user and customer",
        variant: "destructive",
      });
      return;
    }
    assignUserMutation.mutate();
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserName || !newUserCustomer) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate();
  };

  const handleCloseCreateDialog = () => {
    if (createdPassword) {
      resetCreateForm();
    }
    setIsCreateDialogOpen(false);
  };

  const filteredUsers = customerUsers?.filter((user) =>
    user.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.wms_customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available users (not already assigned to this customer)
  const assignedUserIds = new Set(customerUsers?.map(u => u.user_id) || []);
  const availableUsers = allUsers?.filter(u => !assignedUserIds.has(u.id));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WMS User Management</h1>
          <p className="text-muted-foreground">
            Assign users to WMS customers and manage their access
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Existing User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign User to Customer</DialogTitle>
              <DialogDescription>
                Link an existing user to a WMS customer and optional branch
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name} ({customer.customer_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCustomer && (
                <div className="space-y-2">
                  <Label>Branch (Optional)</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="All branches (no specific branch)" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignUser} disabled={assignUserMutation.isPending}>
                Assign User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New WMS User</DialogTitle>
              <DialogDescription>
                Create a new user account and assign them to a WMS customer
              </DialogDescription>
            </DialogHeader>
            
            {createdPassword ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription className="space-y-2">
                    <p className="font-semibold">User created successfully!</p>
                    <p className="text-sm">Please save this temporary password and share it with the user:</p>
                    <div className="bg-background p-3 rounded-md border font-mono text-sm break-all">
                      {createdPassword}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The user should change this password after their first login.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    placeholder="+968 1234 5678"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={newUserCustomer} onValueChange={setNewUserCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name} ({customer.customer_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseCreateDialog}>
                {createdPassword ? 'Close' : 'Cancel'}
              </Button>
              {!createdPassword && (
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Users</CardTitle>
          <CardDescription>
            Users currently assigned to WMS customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.profiles.full_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.profiles.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.wms_customers.company_name}
                      <span className="text-muted-foreground ml-2">
                        ({user.wms_customers.customer_code})
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.wms_customer_branches?.branch_name || (
                        <span className="text-muted-foreground">All branches</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUserMutation.mutate(user.id)}
                        disabled={removeUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
