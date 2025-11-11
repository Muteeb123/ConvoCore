import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Repeat,
  Edit,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Task } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TaskModal } from "@/components/modals/task-modal";
import { useUserStore, useRoleStore } from "@/stores/useRoleStore";
import { ViewtaskModel } from "@/components/modals/view-task-model";
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // Default tab
  const [AllowedCreateTask, setAllowedCreateTask] = useState(false);
  const [AllowedDeleteTask, setAllowedDeleteTask] = useState(false);
  const [AllowedEditTask, setAllowedEditTask] = useState(false);
  const [isViewTaskModel, setViewTaskModel] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  // const { user } = useAuth(); // Using activeUser from store instead
  const [page, setPage] = useState(1);
  const limit = 25;

  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user); // Get user from Zustand store

  // --- 👇 UPDATED useQuery for Tasks 👇 ---
  const {
    data: tasksData,
    isLoading,
    isFetching,
  } = useQuery<Task[]>({
    // Add activeTab and searchTerm to queryKey
    queryKey: [
      "/api/tasks",
      activeUser?.id,
      userrole?.name,
      page,
      limit,
      activeTab,
      searchTerm,
    ],
    queryFn: async () => {
      if (!activeUser?.id || !userrole?.name) {
        console.log("User or role missing, skipping fetch.");
        return []; // Return empty array if user/role isn't ready
      }

      const currentOffset = (page - 1) * limit;
      // Build URL with search and status (from activeTab)
      let url = `/api/tasks?role=${userrole.name}&userId=${activeUser.id}&limit=${limit}&offset=${currentOffset}`; // Include userId
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      // Add status filter based on the active tab (unless 'all')
      if (activeTab !== "all") {
        url += `&status=${encodeURIComponent(activeTab)}`; // Send tab value as status
      }

      console.log("Fetching Tasks URL:", url);
      try {
        // Use apiRequest helper if available, otherwise use fetch
        const res = await apiRequest("GET", url);
        // const res = await fetch(url); // Alternative if apiRequest not set up

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Failed to fetch tasks:", res.status, errorText);
          toast({
            title: "Fetch Error",
            description: `Server responded with status ${res.status}`,
            variant: "destructive",
          });
          throw new Error(`Failed to fetch tasks: ${res.status}`);
        }
        const data = await res.json();
        // Basic validation - expecting an array, first item *might* have counts
        if (!Array.isArray(data)) {
          console.error("Invalid task data structure received:", data);
          toast({
            title: "Data Error",
            description: "Received invalid task data from server.",
            variant: "destructive",
          });
          throw new Error("Invalid task data structure received from server.");
        }
        return data;
      } catch (err) {
        console.error("Error during task fetch:", err);
        if (
          !(
            err instanceof Error &&
            err.message.startsWith("Failed to fetch tasks")
          )
        ) {
          toast({
            title: "Fetch Error",
            description:
              err instanceof Error
                ? err.message
                : "An unknown task fetch error occurred",
            variant: "destructive",
          });
        }
        return []; // Return empty array on error
      }
    },
    enabled: !!activeUser?.id && !!userrole?.name, // Ensure user and role are loaded
  });

  // Safely access data
  const tasks = tasksData ?? [];
  // --- Get total count and status counts from the FIRST task item (backend MUST provide this) ---
  const totaltasks = tasks[0]?.totalcount ?? 0;
  const statusCounts = tasks[0]?.statusCounts ?? {}; // Use statusCounts from data
  const totalItems = totaltasks;

  console.log("Tasks data rendered:", tasks);
  console.log("Total tasks count from API:", totaltasks);
  console.log("Status counts from API:", statusCounts);

  // --- 👇 REMOVE CLIENT-SIDE FILTERING LOGIC 👇 ---
  // const filteredTasks = tasks.filter(task => { ... });

  // Reset page when search or tab changes
  useEffect(() => {
    if (page !== 1) {
      console.log("Search or Tab changed, resetting page to 1 for Tasks");
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeTab]); // Dependencies that reset page

  const totalPages = totaltasks > 0 ? Math.ceil(totaltasks / limit) : 0;

  // Permissions useEffect
  useEffect(() => {
    const rolePermissions = (userrole as any)?.permissions as
      | string[]
      | undefined;
    setAllowedCreateTask(
      rolePermissions?.includes("all") ||
        rolePermissions?.includes("create_tasks") ||
        false
    );
    setAllowedDeleteTask(
      rolePermissions?.includes("all") ||
        rolePermissions?.includes("delete_tasks") ||
        false
    );
    setAllowedEditTask(
      rolePermissions?.includes("all") ||
        rolePermissions?.includes("edit_tasks") ||
        false
    );
  }, [userrole]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      // Invalidate the specific query key used in useQuery
      queryClient.invalidateQueries({
        queryKey: [
          "/api/tasks",
          activeUser?.id,
          userrole?.name,
          page,
          limit,
          activeTab,
          searchTerm,
        ],
      });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Task> }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, data);
      if (!res.ok) throw new Error("Failed to update task"); // Add error check
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate the specific query key
      queryClient.invalidateQueries({
        queryKey: [
          "/api/tasks",
          activeUser?.id,
          userrole?.name,
          page,
          limit,
          activeTab,
          searchTerm,
        ],
      });
      toast({ title: "Task updated" }); // Add success toast
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // --- Action Handlers ---
  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };
  const handleDeleteTask = async (id: number) => {
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this task?",
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            await deleteMutation.mutateAsync(id);
          }}
        >
          Delete
        </Button>
      ),
    });
  };
  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setViewTaskModel(true);
  }; // Added handler

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const updateData: Partial<Task> = {
      status: newStatus,
      completedDate:
        newStatus === "completed" ? new Date().toISOString() : null,
    };
    await updateTaskMutation.mutateAsync({ id: task.id, data: updateData });
  };

  // --- UI Helpers ---
  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const getPriorityColor = (priority: string | null): string => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "medium":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "low":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };
  const formatDate = (dateString: string | null | Date): string => {
    if (!dateString) return "—";
    try {
      const date =
        dateString instanceof Date ? dateString : new Date(dateString);
      // Simple date formatting, adjust as needed
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };
  const isOverdue = (task: Task): boolean => {
    // Ensure dueDate is valid before comparing
    if (!task.dueDate) return false;
    try {
      const dueDate = new Date(task.dueDate);
      // Compare date part only
      dueDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today && task.status !== "completed";
    } catch (e) {
      console.error("Invalid dueDate for task:", task.id, task.dueDate);
      return false;
    }
  };

  // --- Use backend counts ---
  const counts = useMemo(
    () => ({
      all: totaltasks, // Total count from backend
      // Note: 'myTasks' count isn't directly provided by the backend structure shown.
      // If needed, the backend would have to calculate and return it explicitly in statusCounts,
      // or a separate query could be made. Using totaltasks for now as a placeholder.
      myTasks: totaltasks, // Placeholder - adjust if backend provides this count
      pending: statusCounts.pending || 0,
      inProgress: statusCounts.in_progress || 0, // Match backend key 'in_progress'
      completed: statusCounts.completed || 0,
      // 'overdue' count needs explicit backend calculation based on date and status
      // Using 'cancelled' as a placeholder if backend sends it, otherwise default to 0
      overdue: statusCounts.overdue || statusCounts.cancelled || 0, // Adjust key based on backend
      cancelled: statusCounts.cancelled || 0, // Include if backend sends it
    }),
    [totaltasks, statusCounts]
  );

  // --- Render Functions ---
  const renderLoading = () => <TableSkeleton />; // Fixed syntax error

  const renderTableContent = () => (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Opportunity</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* --- 👇 Use `tasks` directly 👇 --- */}
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  {" "}
                  {/* Adjusted colSpan */}
                  <div className="text-gray-500">
                    {searchTerm
                      ? "No tasks match your search."
                      : `No ${
                          activeTab === "all" ? "" : activeTab.replace("-", " ")
                        } tasks found.`}
                  </div>
                  {/* Add Reset button if needed when filters are introduced later */}
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      onClick={() => setSearchTerm("")}
                      className="mt-2"
                    >
                      <Repeat className="w-4 h-4 mr-2" /> Clear Search
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map(
                (
                  task // Use `tasks` array
                ) => (
                  <TableRow
                    key={task.id}
                    className={
                      isOverdue(task) ? "bg-red-50 hover:bg-red-100" : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-start space-x-2">
                        {/* Checkbox for completion */}
                        {/* <input
                           type="checkbox"
                           className="mt-1 accent-primary flex-shrink-0" // Style checkbox
                           checked={task.status === "completed"}
                           onChange={() => handleToggleComplete(task)}
                           aria-label={`Mark task ${task.title} as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
                       /> */}
                        {getPriorityIcon(task.priority || "")}
                        <div className="flex-grow min-w-0">
                          {" "}
                          {/* Allow text to wrap/truncate */}
                          <div
                            className={`font-medium ${
                              task.status === "completed"
                                ? "line-through text-gray-500"
                                : "text-gray-900"
                            }`}
                          >
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{task.opportunityName || "—"}</TableCell>
                    <TableCell>{task.leadName || "—"}</TableCell>
                    <TableCell>{task.customerName || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priority || "")}>
                        {task.priority || "Medium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status || "")}>
                        {/* Properly format status like "In Progress" */}
                        {task.status
                          ?.replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                          "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4 text-gray-400" />
                        {/* Display actual assigned username */}
                        <span className="text-sm">
                          {(task as any).assignedUserName ??
                            (task as any).assignedUseName ??
                            "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`flex items-center space-x-1 ${
                          isOverdue(task) ? "text-red-600 font-medium" : ""
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {formatDate(task.dueDate)}
                        </span>
                        {/* Badge moved outside the span for clarity */}
                        {isOverdue(task) && (
                          <Badge variant="destructive" className="ml-1 text-xs">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(task as any).createdUserName ===
                      activeUser?.username ? (
                        <Badge className="bg-green-100 text-green-800">
                          Created
                        </Badge>
                      ) : ((task as any).assignedUserName ??
                          (task as any).assignedUseName) ===
                        activeUser?.username ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          Assigned
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          Other
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {AllowedEditTask && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            className="p-1 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Button>
                        )}
                        {AllowedDeleteTask && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTask(task)}
                          title="View Task Details"
                          className="p-1 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * limit + 1, totalItems)} to{" "}
            {Math.min(page * limit, totalItems)} of {totalItems} Tasks
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            {/* Dynamic Page Numbers */}
            <div className="flex items-center space-x-1">
              {(() => {
                // ... (pagination number logic - unchanged) ...
                const pageNumbers = [];
                const maxPagesToShow = 5;
                const halfMaxPages = Math.floor(maxPagesToShow / 2);
                let startPage = Math.max(1, page - halfMaxPages);
                let endPage = Math.min(totalPages, page + halfMaxPages);
                if (page <= halfMaxPages + 1)
                  endPage = Math.min(totalPages, maxPagesToShow);
                if (page >= totalPages - halfMaxPages)
                  startPage = Math.max(1, totalPages - maxPagesToShow + 1);

                if (startPage > 1) {
                  pageNumbers.push(
                    <Button
                      key={1}
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                    >
                      1
                    </Button>
                  );
                  if (startPage > 2)
                    pageNumbers.push(
                      <Button
                        key="start-ellipsis"
                        variant="ghost"
                        size="sm"
                        disabled
                      >
                        ...
                      </Button>
                    );
                }
                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(
                    <Button
                      key={i}
                      variant={page === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i)}
                    >
                      {i}
                    </Button>
                  );
                }
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1)
                    pageNumbers.push(
                      <Button
                        key="end-ellipsis"
                        variant="ghost"
                        size="sm"
                        disabled
                      >
                        ...
                      </Button>
                    );
                  pageNumbers.push(
                    <Button
                      key={totalPages}
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  );
                }
                return pageNumbers;
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </>
  );

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
          userName="Tasks"
          subtitle="Manage and track your tasks"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {/* Show loading indicator OR table content */}
          {isLoading ? ( // Use isLoading for initial load spinner
            renderLoading()
          ) : (
            <Card className="w-full">
              <CardHeader>
                {/* Title, Description, Buttons */}
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Task Management</CardTitle>
                    <CardDescription>
                      Organize and track your tasks and assignments
                    </CardDescription>
                  </div>
                  {AllowedCreateTask && (
                    // <Button
                    //   onClick={handleAddTask}
                    //   className="bg-primary hover:bg-primary/90 h-9"
                    // >
                    //   <Plus className="w-4 h-4 mr-2" />
                    //   Add Task
                    // </Button>
                    <RoundedPrimaryButton
                      title="Add Task"
                      onClick={handleAddTask}
                      icon={<Plus className="w-4 h-4 mr-2" />}
                      iconAlt="Add"
                    />
                  )}
                </div>
                {/* Search Input */}
                <div className="flex items-center space-x-2 pt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks by title, description, priority, status, assigned user..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                  {/* Add Filter button here if needed */}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-6 mb-4">
                    {/* Use backend counts for badges */}
                    <TabsTrigger value="all">
                      <div className="flex items-center">
                        All Tasks
                        <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                          {counts.all}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="my-tasks">
                      <div className="flex items-center">
                        My Tasks
                        <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                          {counts.myTasks}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      <div className="flex items-center">
                        Pending
                        <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                          {counts.pending}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="in_progress">
                      <div className="flex items-center">
                        In Progress
                        <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                          {counts.inProgress}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      <div className="flex items-center">
                        Completed
                        <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                          {counts.completed}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="overdue">
                      <div className="flex items-center">
                        Overdue
                        <Badge className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-800">
                          {counts.overdue}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  {/* Render content based on active tab */}
                  <TabsContent value={activeTab} className="mt-6">
                    {/* Show loading spinner during refetch ONLY */}
                    {isFetching ? renderLoading() : renderTableContent()}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      {/* Modals */}
     <TaskModal
  isOpen={isModalOpen}
  onClose={() => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({
      queryKey: [
        "/api/tasks",
        activeUser?.id,
        userrole?.name,
        page,
        limit,
        activeTab,
        searchTerm,
      ],
    });
  }}
  task={selectedTask}
/>

      <ViewtaskModel // Corrected Component Name
        isOpen={isViewTaskModel}
        onClose={() => setViewTaskModel(false)}
        SelectedTask={selectedTask}
      />
    </div>
  );
}
