import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { File } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/TableSkeleton";

interface LogFile {
  name: string;
  path: string;
  size?: number;
  lastModified?: string;
}

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery<LogFile[]>({
    queryKey: ["/api/logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const filteredLogs = logs
    .filter((log) => {
      const fileName = log.name.split("/").pop(); // get last part after /
      return fileName?.toLowerCase() !== "placeholder.txt";
    })
    .filter((log) => log.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      // 1. Root container: Full screen, no browser scrolling
      <div className="flex h-screen w-full overflow-hidden">
        {/* 2. Sidebar */}
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* 3. Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
          {/* 4. Fixed Header */}
          <DashboardHeader
            userName="Logs"
            subtitle="Manage your logs here"
            issearch={false}
          />

          {/* Mobile Sidebar Trigger */}
          {!isSidebarOpen && (
            <div className="absolute top-[65px] left-4 z-50 md:hidden ">
              <SidebarTrigger
                className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition "
                onClick={() => setSidebarOpen(true)}
              />
            </div>
          )}

          {/* 5. Scrolling Content Wrapper (Shows Loading Spinner) */}

          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    // 1. Root container: Full screen, no browser scrolling
    <div className="flex h-screen w-full overflow-hidden">
      {/* 2. Sidebar: Fixed width, uses its own internal scrolling */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. Main Content Area: Fills remaining space, flex column */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* 4. Fixed Header: Stays at the top */}
        <DashboardHeader
          userName="Logs"
          subtitle="Manage your logs here"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden ">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition "
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* ✅ 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          <Card className="shadow-md max-w-5xl mx-auto w-full">
            <CardHeader>
              <CardTitle>Log Files</CardTitle>
              <CardDescription>
                Browse, search and download your application logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs h-9" // Added height consistency
                />
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {" "}
                  {/* Centered message */}
                  <p>No logs found{search ? " matching your search" : ""}.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.path}>
                        <TableCell className="flex items-center gap-2 font-medium">
                          {" "}
                          {/* Added font-medium */}
                          <File size={16} className="text-gray-500" />{" "}
                          {/* Added color */}
                          {log.name}
                        </TableCell>
                        <TableCell>
                          {log.size
                            ? `${(log.size / 1024).toFixed(2)} KB`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {log.lastModified
                            ? format(new Date(log.lastModified), "PPP p") // Consistent date format
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline" // Changed variant for better visibility
                            onClick={() =>
                              window.open(
                                `/api/logs/${encodeURIComponent(log.path)}`,
                                "_blank"
                              )
                            }
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
