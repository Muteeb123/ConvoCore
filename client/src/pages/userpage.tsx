import { useState } from "react";
// ✅ KEPT YOUR ORIGINAL IMPORT
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link"; // Keep Next.js link
import { ArrowLeft } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Mail, UserCircle2, ShieldCheck } from "lucide-react";

// Interfaces
interface UserDetails {
  username: string;
  role: string;
  firstname: string;
  lastname: string;
  email: string;
  isactive: boolean;
}

interface ActivityLog {
  id: number;
  timestamp: string;
  performed: string | null;
  activity: string | null;
  description: string | null;
}

interface ApiResponse {
  result: ActivityLog[];
  totalcount: number;
  user: UserDetails | null;
}

const limit = 25;

// Helper for pagination numbers
const getPaginationRange = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  const delta = 2;
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

// --- Loading/Error/No-Data Component ---
const MainContentFeedback = ({
  message,
  showSpinner = false,
}: {
  message: string;
  showSpinner?: boolean;
}) => (
  <main className="flex-1 overflow-y-auto p-6 w-full flex items-center justify-center">
    <div className="flex flex-col items-center justify-center text-center p-8">
      {showSpinner && (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      )}
      <p className="text-gray-500">{message}</p>
    </div>
  </main>
);

export default function UserActivityLogPage() {
  // ✅ KEPT YOUR ORIGINAL HOOK
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");
  console.log("username is : ", username);

  const [page, setPage] = useState(1);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const offset = (page - 1) * limit;

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["userActivityLogs", username, page],
    queryFn: async (): Promise<ApiResponse> => {
      const res = await fetch(
        `/api/activitylogs/user/${username}?limit=${limit}&offset=${offset}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch user activity logs");
      }
      return res.json();
    },
    enabled: !!username,
  });

  // ✅ KEPT YOUR ORIGINAL LOADING CHECK
  if (!username) {
    return <div>Loading...</div>;
  }

  const logs = data?.result ?? [];
  const totalLogs = data?.totalcount ?? 0;
  const user = data?.user;
  const totalPages = Math.ceil(totalLogs / limit);
  const pageNumbers = getPaginationRange(page, totalPages);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
          <DashboardHeader
            userName={`Activities for ${username || "User"}`}
            subtitle="Viewing all logs performed by this user"
            issearch={false}
          />
          {!isSidebarOpen && (
            <div className="absolute top-[65px] left-4 z-50 md:hidden ">
              <SidebarTrigger
                className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
                onClick={() => setSidebarOpen(true)}
              />
            </div>
          )}
          <MainContentFeedback
            message="Loading user activity..."
            showSpinner={true}
          />
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
          <DashboardHeader
            userName={`Activities for ${username || "User"}`}
            subtitle="Viewing all logs performed by this user"
            issearch={false}
          />
          {!isSidebarOpen && (
            <div className="absolute top-[65px] left-4 z-50 md:hidden ">
              <SidebarTrigger
                className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
                onClick={() => setSidebarOpen(true)}
              />
            </div>
          )}
          <MainContentFeedback message="Error fetching data. Please try again." />
        </div>
      </div>
    );
  }

  // --- Main Return ---
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
          userName={`Activities performed by ${user?.username || "User"}`}
          subtitle="Viewing all logs performed by this user"
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

        {/* 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          <div className="mb-4">
            <Link href="/activitylogs" passHref>
              <Button variant="outline" asChild>
                <a>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to All Logs
                </a>
              </Button>
            </Link>
          </div>

          {/* User Details Card */}
          {user && (
            <Card className="mb-6 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {user.firstname} {user.lastname}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        user.isactive
                          ? "border-transparent bg-green-100 text-green-800"
                          : "border-transparent bg-red-100 text-red-800"
                      }
                    >
                      {user.isactive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  A summary of the user's profile and contact information.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 pt-2">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-black">{user.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-black">
                    Username: {user.username}
                  </span>
                </div>
                <div className="flex items-center text-sm mt-1">
                  <ShieldCheck className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span className="capitalize text-black">
                    Role: {user.role}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fallback if user data didn't load but logs did (unlikely with current API) */}
          {!user && !isLoading && (
            <MainContentFeedback message="User details could not be loaded." />
          )}

          {/* Activity Log Table Card */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date and Time</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No activity found for this user.
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
                        <TableCell>{log.activity}</TableCell>
                        <TableCell>{log.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalLogs > 0 && totalPages > 1 && (
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
