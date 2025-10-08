import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Trash2, FileEdit } from "lucide-react";
import { downloadCSV, arrayToCSV } from "@/utils/csvExport";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkOperation {
  type: 'status_update' | 'delete' | 'export';
  table: string;
  filters?: Record<string, any>;
}

export function BulkOperations() {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tables = [
    { value: "shipment_requests", label: "Shipment Requests" },
    { value: "shipments", label: "Shipments" },
    { value: "quotes", label: "Quotes" },
    { value: "payments", label: "Payments" },
  ];

  const loadTableData = async () => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(selectedTable as any)
        .select("*")
        .limit(100);

      if (error) throw error;
      setData(tableData || []);
      setSelectedRows(new Set());
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(row => row.id)));
    }
  };

  const handleBulkExport = () => {
    if (selectedRows.size === 0) {
      toast({ title: "Warning", description: "No rows selected", variant: "destructive" });
      return;
    }

    const selectedData = data.filter(row => selectedRows.has(row.id));
    const csv = arrayToCSV(selectedData);
    downloadCSV(csv, `${selectedTable}_bulk_export_${new Date().toISOString().split('T')[0]}.csv`);
    
    toast({ title: "Success", description: `Exported ${selectedRows.size} rows` });
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedRows.size === 0) {
      toast({ title: "Warning", description: "No rows selected", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const updates = Array.from(selectedRows).map(id => 
        supabase.from(selectedTable as any).update({ status: newStatus }).eq('id', id)
      );

      await Promise.all(updates);
      
      toast({ title: "Success", description: `Updated ${selectedRows.size} rows to ${newStatus}` });
      loadTableData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) {
      toast({ title: "Warning", description: "No rows selected", variant: "destructive" });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedRows.size} rows? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const deletes = Array.from(selectedRows).map(id => 
        supabase.from(selectedTable as any).delete().eq('id', id)
      );

      await Promise.all(deletes);
      
      toast({ title: "Success", description: `Deleted ${selectedRows.size} rows` });
      loadTableData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
          <CardDescription>Perform operations on multiple records at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Table</label>
            <div className="flex gap-2">
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(table => (
                    <SelectItem key={table.value} value={table.value}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={loadTableData} disabled={!selectedTable || loading}>
                Load Data
              </Button>
            </div>
          </div>

          {data.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedRows.size === data.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm">
                    {selectedRows.size} of {data.length} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkExport}
                    disabled={selectedRows.size === 0}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  {selectedTable === 'shipments' || selectedTable === 'shipment_requests' ? (
                    <Select onValueChange={handleBulkStatusUpdate}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedRows.size === 0}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-96 border rounded">
                <div className="p-4 space-y-2">
                  {data.map(row => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 p-3 border rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleRow(row.id)}
                    >
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {row.tracking_number || row.id?.slice(0, 8)}
                        </p>
                        {row.status && (
                          <Badge variant="outline" className="mt-1">
                            {row.status}
                          </Badge>
                        )}
                      </div>
                      {row.created_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}