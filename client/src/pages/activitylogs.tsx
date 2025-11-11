// pages/logs/index.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { Button } from "@/components/ui/button";
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
import Link from "next/link";
import { TableSkeleton } from "@/components/TableSkeleton";

// Interfaces remain the same
export interface ActivityLog {
  id: number;
  timestamp: string;
  performed: string | null;
  activity: string | null;
  description: string | null;
}

interface ApiResponse {
  result: ActivityLog[];
  totalcount: number;
}

const limit = 25;

const getPaginationRange = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  const delta = 2; // Pages to show on each side of the current page
  const range = [];
  for (
    let i = Math.max(2, currentPage - delta);
    i <= Math.min(totalPages - 1, currentPage + delta);
    i++
  ) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    range.unshift("...");
  }
  if (currentPage + delta < totalPages - 1) {
    range.push("...");
  }

  range.unshift(1);
  if (totalPages > 1) {
    range.push(totalPages);
  }

  return range;
};

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const offset = (page - 1) * limit;

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["activityLogs", page],
    queryFn: async (): Promise<ApiResponse> => {
      const res = await fetch(
        `/api/activitylogs?limit=${limit}&offset=${offset}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch activity logs");
      }
      return res.json();
    },
    refetchOnMount: "always",
  });

  // ✅ UPDATED LOADING STATE
  if (isLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {" "}
        {/* Root layout */}
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            userName="Activity Logs"
            subtitle="Track all user activities"
            issearch={false}
          />
          {/* Main content area scrolls */}
          {/* <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </main> */}
          <TableSkeleton />
        </div>
      </div>
    );
  }

  // ✅ UPDATED ERROR STATE
  if (error) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {" "}
        {/* Root layout */}
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            userName="Activity Logs"
            subtitle="Track all user activities"
            issearch={false}
          />
          {/* Main content area scrolls */}
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <p className="text-red-500">
              Error fetching data. Please try again.
            </p>
          </main>
        </div>
      </div>
    );
  }

  const logs = data?.result ?? [];
  const totalLogs = data?.totalcount ?? 0;
  const totalPages = Math.ceil(totalLogs / limit);

  // Get the page numbers to display
  const pageNumbers = getPaginationRange(page, totalPages);

  // ✅ UPDATED MAIN RETURN BLOCK
  return (
    // 1. Root container: Full screen, no browser scrolling
    <div className="flex h-screen w-full overflow-hidden">
      {/* 2. Sidebar: Fixed width, has its own internal scrolling */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. Main Content Area: Fills remaining space, flex column */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* 4. Fixed Header: Stays at the top of the main content */}
        <DashboardHeader
          userName="Activity Logs"
          subtitle="Track all user activities"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden ">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* 5. Scrolling Content: This is the only part that scrolls on the right */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>
                A complete log of all actions performed in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Date and Time</TableHead>
                    <TableHead className="w-[180px]">Performed by</TableHead>
                    <TableHead className="w-[150px]">Activity</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No activity logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(
                            new Date(log.timestamp),
                            "MMM d, yyyy, hh:mm a"
                          )}
                        </TableCell>
                        <TableCell>
                          {log.performed ? (
                            <Link
                              href={{
                                pathname: "/userpage",
                                query: { username: log.performed },
                              }}
                              passHref
                            >
                              <a className="font-medium text-primary hover:underline cursor-pointer">
                                {log.performed}
                              </a>
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-500">
                              System
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{log.activity}</TableCell>
                        <TableCell>{log.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalLogs > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-500">
                    Showing {offset + 1} to{" "}
                    {Math.min(offset + limit, totalLogs)} of {totalLogs} logs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>

                    {pageNumbers.map((pageNum, index) =>
                      typeof pageNum === "number" ? (
                        <Button
                          key={index}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      ) : (
                        <span key={index} className="px-2 py-1 text-sm">
                          {pageNum}
                        </span>
                      )
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={page === totalPages || !totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
