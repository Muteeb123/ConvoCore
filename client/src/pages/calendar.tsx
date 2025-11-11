import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter"; // Kept your import
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { Button } from "@/components/ui/button";
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  Eye,
} from "lucide-react";
import { Meeting } from "@shared/schema";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { AddMeetingModel } from "@/components/modals/add-meeting-model";
import { ViewPreviousMeetings } from "@/components/modals/view-previous-meetings";
import { ViewMeetingModal } from "@/components/modals/view-meeting-model";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false);
  const [
    isPreviewPreviousMeetingsModalOpen,
    setIsPreviewPreviousMeetingsModalOpen,
  ] = useState(false);
  const [isViewMeetingModelOpen, setIsViewMeetingModelOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [, setLocation] = useLocation(); // Kept your import
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null); // Keep - unused but harmless
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    // Add queryFn options if needed, e.g., staleTime
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffInMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`;
    }
  };
  const getMeetingsForDate = (date: Date) => {
    return meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return (
        meetingDate.getDate() === date.getDate() &&
        meetingDate.getMonth() === date.getMonth() &&
        meetingDate.getFullYear() === date.getFullYear()
      );
    });
  };
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    const dayMeetings = getMeetingsForDate(date);
    if (dayMeetings.length === 0) return null;

    return (
      <div className="flex justify-center mt-1">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center space-x-0.5 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {dayMeetings.slice(0, 3).map((m, idx) => (
                <div
                  key={m.id + idx}
                  className="w-2 h-2 rounded-full bg-blue-500 border border-white shadow"
                />
              ))}
              {dayMeetings.length > 3 && (
                <span className="text-[10px] text-gray-500">
                  +{dayMeetings.length - 3}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start" side="top">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                {date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dayMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedMeeting(meeting);
                      setIsViewMeetingModelOpen(true);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(meeting.startTime)} -{" "}
                        {formatTime(meeting.endTime)}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);

    let classes = "rounded-md transition-colors duration-200 ";

    if (currentDate.getTime() === today.getTime()) {
      classes += "bg-blue-100 text-blue-800 font-bold hover:bg-blue-200";
    } else if (currentDate < today) {
      classes += "text-gray-400 bg-gray-50 hover:bg-gray-100";
    } else {
      classes += "hover:bg-gray-100";
    }
    if (selectedDate && currentDate.getTime() === selectedDate.getTime()) {
      classes += " ring-2 ring-blue-400";
    }

    return classes;
  };

  const todaysMeetings = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.startTime);
    const today = new Date();
    return meetingDate.toDateString() === today.toDateString();
  });

  const upcomingMeetings = meetings
    .filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      const today = new Date();
      return meetingDate > today;
    })
    .slice(0, 5);

  // --- Render Loading Spinner Function ---
  const renderLoading = () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

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
          userName="Calendar"
          subtitle="Manage your meetings and schedule"
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
        <main className="flex-1 overflow-y-auto p-6">
          {/* ✅ Added top-level isLoading check */}
          {isLoading ? (
            renderLoading()
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar View */}
              <div className="lg:col-span-2">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>Calendar View</CardTitle>
                      {/* <Button
                        size="sm"
                        onClick={() => setIsAddMeetingModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Meeting
                      </Button> */}
                      <RoundedPrimaryButton
                        title="New Meeting"
                        onClick={() => setIsAddMeetingModalOpen(true)}
                        icon={<Plus className="w-4 h-4 mr-2" />}
                        iconAlt="Add"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <Calendar
                        value={selectedDate}
                        onChange={(value) => {
                          if (value instanceof Date) {
                            setSelectedDate(value);
                          } else if (Array.isArray(value) && value[0]) {
                            setSelectedDate(value[0]);
                          }
                        }}
                        className="border-none rounded-lg w-full custom-calendar"
                        tileClassName={tileClassName}
                        tileContent={tileContent}
                        view="month"
                        next2Label={null}
                        prev2Label={null}
                        minDetail="year"
                        navigationLabel={({ date }) => (
                          <span className="font-semibold text-gray-800">
                            {date.toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      />
                    </div>

                    {selectedDate && (
                      <div className="mt-6">
                        <h3 className="font-medium text-lg mb-3">
                          Meetings on{" "}
                          {selectedDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </h3>
                        {getMeetingsForDate(selectedDate).length === 0 ? (
                          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                            No meetings scheduled
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {getMeetingsForDate(selectedDate).map((meeting) => (
                              <div
                                key={meeting.id}
                                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setSelectedMeeting(meeting);
                                  setIsViewMeetingModelOpen(true);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">
                                      {meeting.title}
                                    </h3>
                                    {meeting.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                        {meeting.description}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                      <div className="flex items-center space-x-1">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                          {formatTime(meeting.startTime)} -{" "}
                                          {formatTime(meeting.endTime)}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="ml-2"
                                        >
                                          {getDuration(
                                            meeting.startTime,
                                            meeting.endTime
                                          )}
                                        </Badge>
                                      </div>
                                      {meeting.location && (
                                        <div className="flex items-center space-x-1">
                                          <MapPin className="w-4 h-4" />
                                          <span>{meeting.location}</span>
                                        </div>
                                      )}
                                      {meeting.attendees &&
                                        meeting.attendees.length > 0 && (
                                          <div className="flex items-center space-x-1">
                                            <Users className="w-4 h-4" />
                                            <span>
                                              {meeting.attendees.length}{" "}
                                              attendees
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                  <Eye className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6 shadow-sm">
                  <CardHeader>
                    <CardTitle>Today's Meetings</CardTitle>
                    <CardDescription>
                      {todaysMeetings.length} meetings scheduled for today
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* ✅ Removed redundant isLoading check */}
                    {todaysMeetings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No meetings scheduled for today
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {todaysMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              setIsViewMeetingModelOpen(true);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">
                                  {meeting.title}
                                </h3>
                                {meeting.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                    {meeting.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {formatTime(meeting.startTime)} -{" "}
                                      {formatTime(meeting.endTime)}
                                    </span>
                                    <Badge variant="outline" className="ml-2">
                                      {getDuration(
                                        meeting.startTime,
                                        meeting.endTime
                                      )}
                                    </Badge>
                                  </div>
                                  {meeting.location && (
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="w-4 h-4" />
                                      <span>{meeting.location}</span>
                                    </div>
                                  )}
                                  {meeting.attendees &&
                                    meeting.attendees.length > 0 && (
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-4 h-4" />
                                        <span>
                                          {meeting.attendees.length} attendees
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>
                              <Eye className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setIsAddMeetingModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setLocation("/view-all-meetings")}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      View All Meetings
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() =>
                        setIsPreviewPreviousMeetingsModalOpen(true)
                      }
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Meeting History
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Upcoming Meetings</CardTitle>
                    <CardDescription>Next 5 scheduled meetings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* ✅ Removed redundant isLoading check */}
                    {upcomingMeetings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No upcoming meetings
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              setIsViewMeetingModelOpen(true);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-gray-900 truncate">
                                  {meeting.title}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-500">
                                    {formatDate(meeting.startTime)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(meeting.startTime)}
                                  </span>
                                </div>
                                {meeting.location && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500 truncate">
                                      {meeting.location}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Eye className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0 ml-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Meeting Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Total Meetings
                        </span>
                        <span className="font-medium">{meetings.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Today</span>
                        <span className="font-medium">
                          {todaysMeetings.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Upcoming</span>
                        <span className="font-medium">
                          {upcomingMeetings.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Past Meetings
                        </span>
                        <span className="font-medium">
                          {
                            meetings.filter(
                              (m) => new Date(m.startTime) < new Date()
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddMeetingModel
        isOpen={isAddMeetingModalOpen}
        onClose={() => setIsAddMeetingModalOpen(false)}
      />
      <ViewPreviousMeetings
        isOpen={isPreviewPreviousMeetingsModalOpen}
        onClose={() => setIsPreviewPreviousMeetingsModalOpen(false)}
      />
      <ViewMeetingModal
        isOpen={isViewMeetingModelOpen}
        onClose={() => setIsViewMeetingModelOpen(false)}
        meeting={selectedMeeting}
      />

      {/* Global Styles for Calendar */}
      <style jsx global>{`
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
          background-color: #f0f0f0; /* Lighter gray for disabled */
          color: #d1d5db; /* Lighter text for disabled */
        }
        .custom-calendar abbr[title] {
          text-decoration: none;
          font-weight: 500;
        }
        .custom-calendar .react-calendar__month-view__weekdays {
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          font-size: 0.75rem; /* text-xs */
          color: #6b7280; /* gray-500 */
        }
        .custom-calendar .react-calendar__tile {
          padding: 8px 6px;
          height: 70px; /* Increased height */
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
          margin-bottom: 4px; /* Space between number and dots */
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
