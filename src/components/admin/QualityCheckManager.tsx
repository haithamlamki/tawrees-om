import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Upload, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QualityCheck {
  id: string;
  shipment_id: string;
  status: 'pending' | 'passed' | 'failed' | 'requires_review';
  quantity_expected: number | null;
  quantity_actual: number | null;
  weight_expected: number | null;
  weight_actual: number | null;
  notes: string | null;
  qc_fee: number;
  performed_at: string | null;
  created_at: string;
}

interface QCChecklistItem {
  check_item: string;
  status: 'pass' | 'fail' | 'na';
  notes: string;
}

const DEFAULT_CHECKLIST = [
  { check_item: 'Package Condition', status: 'na' as const, notes: '' },
  { check_item: 'Quantity Verification', status: 'na' as const, notes: '' },
  { check_item: 'Weight Verification', status: 'na' as const, notes: '' },
  { check_item: 'Label Accuracy', status: 'na' as const, notes: '' },
  { check_item: 'Product Quality', status: 'na' as const, notes: '' },
];

export function QualityCheckManager() {
  const [qcRecords, setQCRecords] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState("");
  const [shipments, setShipments] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    quantity_expected: "",
    quantity_actual: "",
    weight_expected: "",
    weight_actual: "",
    qc_fee: "50",
    notes: "",
    status: "pending" as const,
  });

  const [checklist, setChecklist] = useState<QCChecklistItem[]>(DEFAULT_CHECKLIST);
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [qcData, shipmentsData] = await Promise.all([
        supabase.from("quality_checks").select("*").order("created_at", { ascending: false }),
        supabase.from("shipments").select("id, tracking_number, status").order("created_at", { ascending: false }),
      ]);

      if (qcData.data) setQCRecords(qcData.data as any);
      if (shipmentsData.data) setShipments(shipmentsData.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) {
      toast({ title: "Error", description: "Please select a shipment", variant: "destructive" });
      return;
    }

    try {
      const { data: qcData, error: qcError } = await supabase
        .from("quality_checks")
        .insert({
          shipment_id: selectedShipment,
          quantity_expected: formData.quantity_expected ? parseInt(formData.quantity_expected) : null,
          quantity_actual: formData.quantity_actual ? parseInt(formData.quantity_actual) : null,
          weight_expected: formData.weight_expected ? parseFloat(formData.weight_expected) : null,
          weight_actual: formData.weight_actual ? parseFloat(formData.weight_actual) : null,
          qc_fee: parseFloat(formData.qc_fee),
          notes: formData.notes,
          status: formData.status,
          performed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (qcError) throw qcError;

      // Insert checklist items
      const checklistInserts = checklist.map((item) => ({
        qc_id: qcData.id,
        check_item: item.check_item,
        status: item.status,
        notes: item.notes,
      }));

      await supabase.from("qc_checklist").insert(checklistInserts);

      // Upload photos if any
      if (photos.length > 0) {
        for (const photo of photos) {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${qcData.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('shipment-documents')
            .upload(fileName, photo);

          if (!uploadError) {
            await supabase.from("qc_photos").insert({
              qc_id: qcData.id,
              file_path: fileName,
              file_name: photo.name,
              file_size: photo.size,
            });
          }
        }
      }

      toast({ title: "Success", description: "Quality check recorded successfully" });
      loadData();
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      quantity_expected: "",
      quantity_actual: "",
      weight_expected: "",
      weight_actual: "",
      qc_fee: "50",
      notes: "",
      status: "pending",
    });
    setChecklist(DEFAULT_CHECKLIST);
    setPhotos([]);
    setSelectedShipment("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", icon: AlertCircle, color: "text-yellow-500" },
      passed: { variant: "default", icon: CheckCircle, color: "text-green-500" },
      failed: { variant: "destructive", icon: XCircle, color: "text-red-500" },
      requires_review: { variant: "secondary", icon: AlertCircle, color: "text-orange-500" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Quality Check</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Shipment</Label>
              <Select value={selectedShipment} onValueChange={setSelectedShipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment" />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.tracking_number} - {s.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity_expected}
                  onChange={(e) => setFormData({ ...formData, quantity_expected: e.target.value })}
                />
              </div>
              <div>
                <Label>Actual Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity_actual}
                  onChange={(e) => setFormData({ ...formData, quantity_actual: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.weight_expected}
                  onChange={(e) => setFormData({ ...formData, weight_expected: e.target.value })}
                />
              </div>
              <div>
                <Label>Actual Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.weight_actual}
                  onChange={(e) => setFormData({ ...formData, weight_actual: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>QC Fee ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.qc_fee}
                onChange={(e) => setFormData({ ...formData, qc_fee: e.target.value })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="requires_review">Requires Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Checklist</Label>
              <div className="space-y-2 mt-2">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                    <span className="flex-1">{item.check_item}</span>
                    <Select
                      value={item.status}
                      onValueChange={(value: 'pass' | 'fail' | 'na') => {
                        const newChecklist = [...checklist];
                        newChecklist[idx].status = value;
                        setChecklist(newChecklist);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Upload Photos</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setPhotos(Array.from(e.target.files || []))}
              />
              {photos.length > 0 && <p className="text-sm text-muted-foreground mt-1">{photos.length} file(s) selected</p>}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit">Record Quality Check</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality Check History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {qcRecords.map((qc) => (
                <div key={qc.id} className="p-4 border rounded space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">Shipment ID: {qc.shipment_id.slice(0, 8)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {qc.performed_at ? new Date(qc.performed_at).toLocaleString() : "Not performed"}
                      </p>
                    </div>
                    {getStatusBadge(qc.status)}
                  </div>
                  {qc.quantity_expected && (
                    <p className="text-sm">
                      Quantity: {qc.quantity_actual}/{qc.quantity_expected}
                    </p>
                  )}
                  {qc.weight_expected && (
                    <p className="text-sm">
                      Weight: {qc.weight_actual}kg/{qc.weight_expected}kg
                    </p>
                  )}
                  <p className="text-sm">QC Fee: ${qc.qc_fee}</p>
                  {qc.notes && <p className="text-sm text-muted-foreground">{qc.notes}</p>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}