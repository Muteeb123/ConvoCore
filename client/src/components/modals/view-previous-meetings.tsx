import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, Users, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Meeting {
  id: number;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  attendees: string[];
  organizedByUserId: number;
  leadId?: number | null;
  contactId?: number | null;
  opportunityId?: number | null;
}

interface ViewPreviousMeetingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ViewPreviousMeetings({ isOpen, onClose }: ViewPreviousMeetingsProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/meetings");
      return response.json();
    },
  });

  // Filter past meetings
  const now = new Date();
  const pastMeetings = meetings.filter((m) => new Date(m.endTime) < now);

  // Filter meetings by search term
  const filteredMeetings = pastMeetings.filter((meeting) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      meeting.title.toLowerCase().includes(searchLower) ||
      (meeting.description && meeting.description.toLowerCase().includes(searchLower)) ||
      meeting.attendees.some(attendee => attendee.toLowerCase().includes(searchLower)) ||
      (meeting.location && meeting.location.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-4xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Previous Meetings
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 px-1 py-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings by title, description, attendees or location..."
              className="pl-10"
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
        </div>

        <ScrollArea className="flex-1 mt-2 rounded-md border">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading meetings...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchTerm ? "No matching meetings found." : "No previous meetings found."}
            </div>
          ) : (
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="border-r font-medium">Title</TableHead>
                  <TableHead className="border-r">Description</TableHead>
                  <TableHead className="border-r">Time</TableHead>
                  <TableHead className="border-r">Location</TableHead>
                  <TableHead>Attendees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id} className="border-t hover:bg-muted/50">
                    <TableCell className="font-medium border-r">
                      <div className="font-semibold">{meeting.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(meeting.startTime).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="border-r max-w-[200px] truncate" title={meeting.description || undefined}>
                      {meeting.description || "-"}
                    </TableCell>
                    <TableCell className="border-r">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {" "}
                          {new Date(meeting.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r">
                      {meeting.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{meeting.location}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {meeting.attendees.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[200px] truncate" title={meeting.attendees.join(", ")}>
                            {meeting.attendees.join(", ")}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <div className="flex justify-end mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}