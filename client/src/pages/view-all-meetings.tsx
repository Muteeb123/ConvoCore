import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// import { Sidebar } from "@/components/layout/sidebar";
// import { Header } from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebarv-2"; // Assuming sidebarv-2 is correct
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  Edit,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, isToday, isPast, isFuture, parseISO, set } from "date-fns";
import { ViewMeetingModal } from "@/components/modals/view-meeting-model";
import { AddMeetingModel } from "@/components/modals/add-meeting-model";

interface Meeting {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  organizedByUserId: number;
  leadId?: number;
  contactId?: number;
  opportunityId?: number;
  createdAt: string;
  updatedAt: string;
}

export function MeetingsPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();
  const [selectedMeeting, setSelectedMeeting] = React.useState<Meeting | null>(
    null
  );
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isViewMeetingModelOpen, setIsViewMeetingModelOpen] =
    React.useState(false);
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] =
    React.useState(false);
  const [filters, setFilters] = React.useState({
    timeFrame: "all",
    location: "",
    hasAttendees: "all",
  });
  const [showFilters, setShowFilters] = React.useState(false);

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/meetings");
      return response.json();
    },
  });

  const handleDeleteMeeting = async (id: number) => {
    if (selectedMeeting?.id === id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this lead?",
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            await deleteMeetingMutation.mutateAsync(id);
          }}
        >
          Delete
        </Button>
      ),
    });
  };

  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meetings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting"] });
      toast({
        title: "Meeting deleted",
        description: "The Meeting has been successfully deleted.",
      });
      queryClient.invalidateQueries();
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      searchTerm === "" ||
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meeting.description &&
        meeting.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      meeting.attendees.some((attendee) =>
        attendee.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (meeting.location &&
        meeting.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const now = new Date();
    const meetingDate = parseISO(meeting.startTime);
    let matchesTimeFrame = true;

    if (filters.timeFrame === "past") {
      matchesTimeFrame = isPast(meetingDate);
    } else if (filters.timeFrame === "today") {
      matchesTimeFrame = isToday(meetingDate);
    } else if (filters.timeFrame === "future") {
      matchesTimeFrame = isFuture(meetingDate);
    }

    const matchesLocation =
      filters.location === "" ||
      (meeting.location &&
        meeting.location
          .toLowerCase()
          .includes(filters.location.toLowerCase()));
    const matchesAttendees =
      filters.hasAttendees === "all" ||
      (filters.hasAttendees === "yes" && meeting.attendees.length > 0) ||
      (filters.hasAttendees === "no" && meeting.attendees.length === 0);

    return (
      matchesSearch && matchesTimeFrame && matchesLocation && matchesAttendees
    );
  });

  const getMeetingStatus = (startTime: string) => {
    const meetingDate = parseISO(startTime);
    if (isToday(meetingDate)) return "today";
    if (isPast(meetingDate)) return "past";
    return "future";
  };

  const clearFilters = () => {
    setFilters({
      timeFrame: "all",
      location: "",
      hasAttendees: "all",
    });
    setSearchTerm("");
  };

  return (
    // <div className="flex h-screen bg-gray-50">
    //   <Sidebar />
    //   <div className="flex-1 flex flex-col overflow-hidden">
    //     <Header
    //       title="All Meetings"
    //       subtitle="View and manage all your meetings"
    //     />
    //     <main className="flex-1 overflow-y-auto p-6">
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
          userName="All Meetings"
          subtitle="View and manage all your meetings"
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

        {/* ✅ 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          <div className="flex flex-col gap-4">
            {/* This h1 is redundant with the header, consider removing or hiding */}
            <h1 className="text-2xl font-bold flex items-center gap-2 sr-only">
              <Calendar className="h-6 w-6" />
              All Meetings
            </h1>

            {/* Filter/Search Card */}
            <div className="flex flex-col gap-4 bg-background rounded-lg border p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search meetings..."
                    className="pl-10 h-9" // Added height
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <X
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-pointer"
                      onClick={() => setSearchTerm("")}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2 h-9" // Added height
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {showFilters ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    className="h-9" // Added height
                    onClick={() => {
                      setSelectedMeeting(null);
                      setIsAddMeetingModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t items-end">
                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Time Frame
                    </Label>
                    <Select
                      value={filters.timeFrame}
                      onValueChange={(value) =>
                        setFilters({ ...filters, timeFrame: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select time frame" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Meetings</SelectItem>
                        <SelectItem value="past">Past Meetings</SelectItem>
                        <SelectItem value="today">Today's Meetings</SelectItem>
                        <SelectItem value="future">Future Meetings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Location
                    </Label>
                    <Input
                      placeholder="Filter by location"
                      className="h-9"
                      value={filters.location}
                      onChange={(e) =>
                        setFilters({ ...filters, location: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Attendees
                    </Label>
                    <Select
                      value={filters.hasAttendees}
                      onValueChange={(value) =>
                        setFilters({ ...filters, hasAttendees: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Filter by attendees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">With Attendees</SelectItem>
                        <SelectItem value="no">Without Attendees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <Button variant="ghost" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" /> Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Table Card */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Note: isLoading check is already at the top */}
                  {filteredMeetings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {" "}
                        {/* Adjusted colSpan */}
                        No meetings found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMeetings.map((meeting) => {
                      const status = getMeetingStatus(meeting.startTime);
                      const start = parseISO(meeting.startTime);
                      const end = parseISO(meeting.endTime);
                      const duration = Math.round(
                        (end.getTime() - start.getTime()) / (1000 * 60)
                      );

                      return (
                        <TableRow
                          key={meeting.id}
                          className={cn(
                            status === "past" && "bg-muted/50", // Use muted/50
                            status === "today" && "bg-blue-50",
                            status === "future" && "bg-green-50"
                          )}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedMeeting(meeting);
                                  setIsViewMeetingModelOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                              <div>
                                {meeting.title}
                                {meeting.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
                                    {meeting.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div>{format(start, "MMM d, yyyy")}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(start, "h:mm a")} -{" "}
                                  {format(end, "h:mm a")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{duration} min</TableCell>
                          <TableCell>
                            {meeting.location ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{meeting.location}</span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {meeting.attendees &&
                            meeting.attendees.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="max-w-[200px] line-clamp-1">
                                  {meeting.attendees.join(", ")}
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                status === "past" &&
                                  "bg-gray-100 text-gray-800",
                                status === "today" &&
                                  "bg-blue-100 text-blue-800",
                                status === "future" &&
                                  "bg-green-100 text-green-800"
                              )}
                            >
                              {status === "past"
                                ? "Completed"
                                : status === "today"
                                ? "Today"
                                : "Upcoming"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedMeeting(meeting);
                                  setIsAddMeetingModalOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedMeeting(meeting); // Set meeting first
                                  handleDeleteMeeting(meeting.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <ViewMeetingModal
        isOpen={isViewMeetingModelOpen}
        onClose={() => setIsViewMeetingModelOpen(false)}
        meeting={selectedMeeting}
      />
      <AddMeetingModel
        isOpen={isAddMeetingModalOpen}
        onClose={() => {
          setIsAddMeetingModalOpen(false);
          setSelectedMeeting(null);
          queryClient.invalidateQueries({ queryKey: ["meetings"] }); // Invalidate query
          // window.location.reload(); // Avoid reload
        }}
        meeting={selectedMeeting ?? undefined}
      />

      {/* Global Styles */}
      <style>{`
        .custom-calendar .react-calendar__navigation button {
          color: #374151;
          min-width: 44px;
          background: none;
          font-size: 16px;
          margin-top: 8px;
        }
        .custom-calendar .react-calendar__navigation button:enabled:hover,
        .custom-calendar .react-calendar__navigation button:enabled:focus {
          background-color: #f3f4f6;
        }
        .custom-calendar .react-calendar__navigation button[disabled] {
          background-color: #f0f0f0;
          color: #d1d5db;
        }
        .custom-calendar abbr[title] {
          text-decoration: none;
          font-weight: 500;
        }
        .custom-calendar .react-calendar__month-view__weekdays {
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .custom-calendar .react-calendar__tile {
          padding: 8px 6px;
          height: 70px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          text-align: center;
        }
        .custom-calendar .react-calendar__tile:disabled {
          background-color: #f9fafb;
          color: #d1d5db;
        }
        .custom-calendar .react-calendar__tile abbr {
          margin-bottom: 4px;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
