import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RateHistory {
  id: string;
  table_name: string;
  record_id: string;
  version_number: number;
  change_type: string;
  changed_by?: string;
  changed_by_email?: string;
  changed_at: string;
  old_values?: any;
  new_values?: any;
  change_reason?: string;
}

export const RateHistoryViewer = () => {
  const { toast } = useToast();
  const [history, setHistory] = useState<RateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterChangeType, setFilterChangeType] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rate_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading rate history:", error);
      toast({
        title: "Error",
        description: "Failed to load rate history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.changed_by_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.record_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTable = filterTable === "all" || item.table_name === filterTable;
    const matchesChangeType = filterChangeType === "all" || item.change_type === filterChangeType;

    return matchesSearch && matchesTable && matchesChangeType;
  });

  const uniqueTables = [...new Set(history.map((item) => item.table_name))];

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "created":
        return "default";
      case "updated":
        return "secondary";
      case "activated":
        return "default";
      case "deactivated":
        return "secondary";
      case "deleted":
        return "destructive";
      default:
        return "outline";
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderValueDiff = (oldValues: any, newValues: any) => {
    if (!oldValues || !newValues) return null;

    const changedFields = Object.keys(newValues).filter(
      (key) => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
    );

    if (changedFields.length === 0) return <p className="text-sm text-muted-foreground">No changes detected</p>;

    return (
      <div className="space-y-2">
        {changedFields.map((field) => (
          <div key={field} className="text-sm border-l-2 border-primary pl-3">
            <p className="font-medium">{field}</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <p className="text-xs text-muted-foreground">Old:</p>
                <p className="text-xs bg-red-50 dark:bg-red-950 p-1 rounded">
                  {JSON.stringify(oldValues[field])}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New:</p>
                <p className="text-xs bg-green-50 dark:bg-green-950 p-1 rounded">
                  {JSON.stringify(newValues[field])}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Rate History
        </CardTitle>
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

            <Select value={filterChangeType} onValueChange={setFilterChangeType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Change type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Changes</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rate history found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <Collapsible key={item.id}>
                  <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getChangeTypeColor(item.change_type)}>
                            v{item.version_number} - {item.change_type}
                          </Badge>
                          <span className="font-mono text-sm">{item.table_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.changed_at), "PPp")}
                          </span>
                        </div>

                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground">Changed by:</span>{" "}
                            {item.changed_by_email || "System"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Record ID:</span>{" "}
                            <span className="font-mono text-xs">{item.record_id}</span>
                          </div>
                          {item.change_reason && (
                            <div>
                              <span className="text-muted-foreground">Reason:</span> {item.change_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {item.old_values && item.new_values && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(item.id)}
                          >
                            {expandedItems.has(item.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {item.old_values && item.new_values && (
                      <CollapsibleContent className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium mb-2">Changes:</h5>
                        {renderValueDiff(item.old_values, item.new_values)}
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
