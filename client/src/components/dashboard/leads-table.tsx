import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lead } from "@shared/schema";
import { useBadgeStore } from "@/stores/useBadgeStore";
import { useEffect } from "react";

export function LeadsTable() {
  const { setBadge } = useBadgeStore();
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads?limit=5");
      return response.json();
    },
  });

  useEffect(() => {
    if (Array.isArray(leads) && leads.length > 0) {
      setBadge("leads", leads.length);
    } else {
      setBadge("leads", 0);
    }
  }, [leads, setBadge]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Leads</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "qualified":
        return "bg-yellow-100 text-yellow-800";
      case "converted":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (name: string) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Leads</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!Array.isArray(leads) || leads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No leads found. Add your first lead to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gray-300 text-gray-600 text-sm">
                            {getInitials(lead.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          <div className="text-sm text-gray-500">{lead.email || "No email"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">{lead.companyName || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status || "")}>
                        {lead.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {lead.assignedUserId ? "Assigned User" : "Unassigned"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {lead.value ? `$${parseFloat(lead.value).toLocaleString()}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
