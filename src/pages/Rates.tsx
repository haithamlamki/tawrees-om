import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, CheckCircle, XCircle, Clock, Calculator } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Origin, Destination, Agreement, RateType, ApprovalStatus } from "@/types/locations";
import { RATE_TYPE_LABELS } from "@/types/locations";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function Rates() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [formData, setFormData] = useState({
    origin_id: "",
    destination_id: "",
    rate_type: "" as RateType | "",
    buy_price: "",
    sell_price: "",
    margin_percent: "",
    min_charge: "",
    valid_from: new Date(),
    valid_to: null as Date | null,
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role, shipping_partner_id")
          .eq("user_id", session.user.id);
        
        console.log("User roles data:", roles);
        
        if (roles && roles.length > 0) {
          // Prefer admin if present, otherwise shipping_partner, else first
          const isAdmin = roles.some(r => r.role === 'admin');
          const partnerRole = roles.find(r => r.role === 'shipping_partner' && r.shipping_partner_id);
          setUserRole(isAdmin ? 'admin' : (partnerRole ? 'shipping_partner' : roles[0].role));
          setPartnerId(partnerRole?.shipping_partner_id || null);
          console.log("Resolved role:", isAdmin ? 'admin' : (partnerRole ? 'shipping_partner' : roles[0].role));
          console.log("Resolved partnerId:", partnerRole?.shipping_partner_id || null);
        }
      }
    } catch (error) {
      console.error("Error loading auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const [originsRes, destinationsRes, agreementsRes] = await Promise.all([
      supabase.from("origins").select("*").eq("active", true).order("name"),
      supabase.from("destinations").select("*").eq("active", true).order("name"),
      supabase
        .from("agreements")
        .select(`*, origins(*), destinations(*)`)
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);

    if (originsRes.data) setOrigins(originsRes.data);
    if (destinationsRes.data) setDestinations(destinationsRes.data);
    if (agreementsRes.data) setAgreements(agreementsRes.data as Agreement[]);
  };

  const calculateSellPrice = (buy: number, margin: number) => {
    return buy * (1 + margin / 100);
  };

  const calculateMargin = (buy: number, sell: number) => {
    return ((sell - buy) / buy) * 100;
  };

  const handleBuyPriceChange = (value: string) => {
    setFormData({ ...formData, buy_price: value });
    if (value && formData.margin_percent) {
      const sell = calculateSellPrice(parseFloat(value), parseFloat(formData.margin_percent));
      setFormData((prev) => ({ ...prev, buy_price: value, sell_price: sell.toFixed(2) }));
    }
  };

  const handleMarginChange = (value: string) => {
    setFormData({ ...formData, margin_percent: value });
    if (value && formData.buy_price) {
      const sell = calculateSellPrice(parseFloat(formData.buy_price), parseFloat(value));
      setFormData((prev) => ({ ...prev, margin_percent: value, sell_price: sell.toFixed(2) }));
    }
  };

  const handleSellPriceChange = (value: string) => {
    setFormData({ ...formData, sell_price: value });
    if (value && formData.buy_price) {
      const margin = calculateMargin(parseFloat(formData.buy_price), parseFloat(value));
      setFormData((prev) => ({ ...prev, sell_price: value, margin_percent: margin.toFixed(2) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.rate_type || !formData.origin_id || !formData.destination_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate pricing
    const buyPrice = parseFloat(formData.buy_price);
    const sellPrice = parseFloat(formData.sell_price);
    
    if (!buyPrice || buyPrice <= 0) {
      toast.error("Buy price must be greater than 0");
      return;
    }
    
    if (!sellPrice || sellPrice <= 0) {
      toast.error("Sell price must be greater than 0");
      return;
    }
    
    if (sellPrice <= buyPrice) {
      toast.error("Sell price must be greater than buy price");
      return;
    }

    if (loading) {
      toast.error("Please wait, loading user information...");
      return;
    }

    console.log("Submit - User Role:", userRole);
    console.log("Submit - Partner ID (state):", partnerId);

    // Ensure we have the partner_id for partners
    let resolvedPartnerId: string | null = partnerId;
    if (userRole === 'shipping_partner' && !resolvedPartnerId) {
      const { data: rolesErrCheck, error: rolesErr } = await supabase
        .from('user_roles')
        .select('shipping_partner_id, role')
        .eq('role', 'shipping_partner')
        .limit(1)
        .maybeSingle();
      if (rolesErr) {
        console.error('Failed to load partner mapping on submit:', rolesErr);
      }
      resolvedPartnerId = rolesErrCheck?.shipping_partner_id ?? null;
      console.log('Resolved partnerId from backend on submit:', resolvedPartnerId);
    }

    // Determine approval status based on who creates it
    let approval_status: ApprovalStatus = 'approved';
    let partner_id_value = resolvedPartnerId;
    
    if (userRole === 'shipping_partner') {
      // Partner creates -> needs admin approval and must set their partner_id
      approval_status = 'pending_admin';
      
      // Ensure partner_id is set for partners - it's required by RLS
      if (!partnerId) {
        console.error("Partner ID is null for shipping_partner role");
        toast.error("Partner ID not found. Please contact admin.");
        return;
      }
      partner_id_value = partnerId;
      console.log("Creating agreement with partner_id:", partner_id_value);
    } else if (userRole === 'admin') {
      // Admin creates -> needs partner approval if partner_id is set
      if (partnerId) {
        approval_status = 'pending_partner';
      }
    }

    const { error } = await supabase.from("agreements").insert({
      origin_id: formData.origin_id,
      destination_id: formData.destination_id,
      rate_type: formData.rate_type,
      buy_price: parseFloat(formData.buy_price),
      sell_price: parseFloat(formData.sell_price),
      margin_percent: parseFloat(formData.margin_percent),
      min_charge: formData.min_charge ? parseFloat(formData.min_charge) : null,
      valid_from: formData.valid_from.toISOString(),
      valid_to: formData.valid_to?.toISOString() || null,
      notes: formData.notes || null,
      partner_id: partner_id_value,
      approval_status,
    });

    if (error) {
      console.error("Agreement creation error:", error);
      
      if (error.message.includes("row-level security")) {
        toast.error("Access denied. Please ensure you're properly linked to a shipping partner company.");
      } else {
        toast.error(`Failed to create agreement: ${error.message}`);
      }
      return;
    }

    const message = approval_status === 'approved' 
      ? "Agreement created successfully"
      : "Agreement created and pending approval";
    toast.success(message);
    loadData();
    // Reset form
    setFormData({
      origin_id: "",
      destination_id: "",
      rate_type: "",
      buy_price: "",
      sell_price: "",
      margin_percent: "",
      min_charge: "",
      valid_from: new Date(),
      valid_to: null,
      notes: "",
    });
  };

  const handleApprove = async (agreementId: string) => {
    const { error } = await supabase
      .from("agreements")
      .update({
        approval_status: 'approved',
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", agreementId);

    if (error) {
      toast.error(`Failed to approve: ${error.message}`);
      return;
    }

    toast.success("Agreement approved successfully");
    loadData();
  };

  const handleReject = async (agreementId: string, reason: string) => {
    const { error } = await supabase
      .from("agreements")
      .update({
        approval_status: 'rejected',
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", agreementId);

    if (error) {
      toast.error(`Failed to reject: ${error.message}`);
      return;
    }

    toast.success("Agreement rejected");
    loadData();
  };

  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending_admin':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Admin</Badge>;
      case 'pending_partner':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Partner</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
  };

  const canApprove = (agreement: Agreement) => {
    if (userRole === 'admin' && agreement.approval_status === 'pending_admin') return true;
    if (userRole === 'shipping_partner' && agreement.approval_status === 'pending_partner') {
      return agreement.partner_id === partnerId;
    }
    return false;
  };

  const testInCalculator = (agreement: Agreement) => {
    let mode = 'air';
    let container = '';
    
    // Map rate_type to calculator mode and container
    if (agreement.rate_type === 'AIR_KG') {
      mode = 'air';
    } else if (agreement.rate_type === 'SEA_CBM') {
      mode = 'sea_lcl';
    } else if (agreement.rate_type.startsWith('SEA_CONTAINER_')) {
      mode = 'sea_fcl';
      container = agreement.rate_type;
    }
    
    // Build query string
    const params = new URLSearchParams({
      mode,
      origin: agreement.origin_id,
      dest: agreement.destination_id,
    });
    
    if (container) {
      params.append('container', container);
    }
    
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Agreements & Rates Management</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Update Rates Form */}
          <Card>
            <CardHeader>
              <CardTitle>Update Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="rate_type">Rate Type</Label>
                  <Select
                    value={formData.rate_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rate_type: value as RateType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RATE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin">Origin (China)</Label>
                    <Select
                      value={formData.origin_id}
                      onValueChange={(value) => setFormData({ ...formData, origin_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                      <SelectContent>
                        {origins.map((origin) => (
                          <SelectItem key={origin.id} value={origin.id}>
                            {origin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="destination">Destination</Label>
                    <Select
                      value={formData.destination_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, destination_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="buy_price">Buy Price (USD)</Label>
                  <Input
                    id="buy_price"
                    type="number"
                    step="0.01"
                    value={formData.buy_price}
                    onChange={(e) => handleBuyPriceChange(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="margin">Margin %</Label>
                    <Input
                      id="margin"
                      type="number"
                      step="0.01"
                      value={formData.margin_percent}
                      onChange={(e) => handleMarginChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="sell_price">Sell Price (USD)</Label>
                    <Input
                      id="sell_price"
                      type="number"
                      step="0.01"
                      value={formData.sell_price}
                      onChange={(e) => handleSellPriceChange(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="min_charge">Min Charge (Optional)</Label>
                  <Input
                    id="min_charge"
                    type="number"
                    step="0.01"
                    value={formData.min_charge}
                    onChange={(e) =>
                      setFormData({ ...formData, min_charge: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valid From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.valid_from, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.valid_from}
                          onSelect={(date) =>
                            date && setFormData({ ...formData, valid_from: date })
                          }
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Valid To (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.valid_to ? format(formData.valid_to, "PPP") : "No expiry"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.valid_to || undefined}
                          onSelect={(date) => setFormData({ ...formData, valid_to: date || null })}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : "Save Agreement"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Rates List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agreements.map((agreement) => {
                  const profit = agreement.sell_price - agreement.buy_price;
                  const isExpired = agreement.valid_to
                    ? new Date(agreement.valid_to) < new Date()
                    : false;

                  return (
                    <Card key={agreement.id} className={isExpired ? "opacity-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {agreement.origins?.name} → {agreement.destinations?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {RATE_TYPE_LABELS[agreement.rate_type]}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getApprovalBadge(agreement.approval_status)}
                            {isExpired && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                Expired
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Buy Price</p>
                            <p className="font-medium">${agreement.buy_price.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sell Price</p>
                            <p className="font-medium">${agreement.sell_price.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              profit > 0 ? "text-green-600" : "text-gray-600"
                            )}
                          >
                            Profit: ${profit.toFixed(2)} ({agreement.margin_percent.toFixed(1)}%)
                          </span>
                        </div>

                        {agreement.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{agreement.notes}</p>
                        )}

                        {/* Test in Calculator button - always show for approved rates */}
                        {agreement.approval_status === 'approved' && !isExpired && (
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testInCalculator(agreement)}
                              className="w-full"
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Test in Calculator
                            </Button>
                          </div>
                        )}

                        {canApprove(agreement) && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(agreement.id)}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const reason = prompt("Rejection reason:");
                                if (reason) handleReject(agreement.id, reason);
                              }}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {agreement.rejection_reason && (
                          <p className="text-xs text-red-600 mt-2">
                            Rejected: {agreement.rejection_reason}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
