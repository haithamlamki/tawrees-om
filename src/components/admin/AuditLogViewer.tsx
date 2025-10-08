import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AuditLog } from "@/types/audit";
import { format } from "date-fns";
import { Search, FileText } from "lucide-react";

export const AuditLogViewer = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    const matchesAction = filterAction === "all" || log.action === filterAction;

    return matchesSearch && matchesTable && matchesAction;
  });

  const uniqueTables = [...new Set(logs.map((log) => log.table_name))];

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, table, or record ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                          <span className="font-mono text-sm">{log.table_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "PPp")}
                          </span>
                        </div>

                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground">User:</span>{" "}
                            {log.user_email || "System"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Record ID:</span>{" "}
                            <span className="font-mono text-xs">{log.record_id}</span>
                          </div>

                          {log.changed_fields && log.changed_fields.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Changed fields:</span>{" "}
                              {log.changed_fields.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
