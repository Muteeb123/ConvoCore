import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Users, User, Briefcase, Mail, Phone, Globe, Tag, DollarSign, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface User {
  id: number;
  username: string;
  rolename: string;
  email: string;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  companyName: string;
  assignedUserName: string;
  email: string;
  phone: string;
  companyWebsite?: string;
}

interface Lead {
  id: number;
  name: string;
  companyName: string;
  assignedUserName: string;
  email?: string;
  phone?: string;
}

interface Opportunity {
  id: number;
  name: string;
  stage: string;
  value: number;
  companyName: string;
  assignedUserName: string;
  expectedCloseDate?: string;
  tags?: string[];
  description?: string;
}

interface Meeting {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  organizedByUserId?: number;
  leadId?: number;
  contactId?: number;
  opportunityId?: number;
  createdAt: string;
}

interface ViewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
}

export function ViewMeetingModal({ isOpen, onClose, meeting } : ViewMeetingModalProps) {
  const [organizedByUser, setOrganizedByUser] = useState<User | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meeting && isOpen) {
      fetchRelatedData();
    }
  }, [meeting, isOpen]);

  const fetchRelatedData = async () => {
    if (!meeting) return;
    
    setLoading(true);
    try {
      if (meeting.organizedByUserId) {
        const userResponse = await fetch(`/api/users/${meeting.organizedByUserId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setOrganizedByUser(userData);
        }
      }

      if (meeting.contactId) {
        const contactResponse = await fetch(`/api/contacts/${meeting.contactId}`);
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          setContact(contactData);
        }
      }

      if (meeting.leadId) {
        const leadResponse = await fetch(`/api/leads/${meeting.leadId}`);
        if (leadResponse.ok) {
          const leadData = await leadResponse.json();
          setLead(leadData);
        }
      }

      if (meeting.opportunityId) {
        const opportunityResponse = await fetch(`/api/opportunities/${meeting.opportunityId}`);
        if (opportunityResponse.ok) {
          const opportunityData = await opportunityResponse.json();
          setOpportunity(opportunityData);
        }
      }
    } catch (error) {
      console.error('Error fetching related data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) return null;

  const startTime = parseISO(meeting.startTime);
  const endTime = parseISO(meeting.endTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  const getMeetingStatus = () => {
    const now = new Date();
    if (isToday(startTime)) return "today";
    if (isPast(startTime)) return "past";
    return "future";
  };

  const status = getMeetingStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meeting Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading meeting details...</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Meeting Basic Info */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{meeting.title}</h2>
                <Badge 
                  variant={status === "past" ? "secondary" : status === "today" ? "default" : "outline"}
                  className={cn(
                    "mt-2",
                    status === "today" && "bg-blue-100 text-blue-800",
                    status === "future" && "bg-green-100 text-green-800"
                  )}
                >
                  {status === "past" ? "Completed" : status === "today" ? "Today" : "Upcoming"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Created: {format(parseISO(meeting.createdAt), "MMM d, yyyy")}
              </div>
            </div>

            {meeting.description && (
              <p className="mt-4 text-sm text-gray-700">{meeting.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Time</h3>
                  <p className="text-sm">
                    {format(startTime, "EEEE, MMMM d, yyyy")}
                    <br />
                    {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                    <span className="text-muted-foreground"> ({duration} min)</span>
                  </p>
                </div>
              </div>

              {meeting.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium">Location</h3>
                    <p className="text-sm">{meeting.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendees */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                Attendees
              </h3>
              <div className="space-y-2">
                {meeting.attendees.map((attendee: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {attendee}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organizer */}
          {organizedByUser && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-muted-foreground" />
                Organized By
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">{organizedByUser.username}</p>
                  <p className="text-sm text-muted-foreground">{organizedByUser.rolename}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {organizedByUser.email}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Related Entities */}
          <div className="space-y-4">
            {/* Contact */}
            {contact && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Related Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.companyName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assigned to: {contact.assignedUserName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {contact.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {contact.phone}
                    </div>
                    {contact.companyWebsite && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={contact.companyWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {contact.companyWebsite}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Lead */}
            {lead && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Related Lead
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.companyName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assigned to: {lead.assignedUserName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Opportunity */}
            {opportunity && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  Related Opportunity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">{opportunity.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{opportunity.stage}</Badge>
                      <span className="text-sm font-medium">
                        ${opportunity.value.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {opportunity.companyName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Assigned to: {opportunity.assignedUserName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {opportunity.expectedCloseDate && (
                      <div className="text-sm">
                        <div className="font-medium">Expected Close</div>
                        <div>
                          {format(parseISO(opportunity.expectedCloseDate), "MMM d, yyyy")}
                        </div>
                      </div>
                    )}
                    {opportunity.tags && opportunity.tags.length > 0 && (
                      <div className="text-sm">
                        <div className="font-medium">Tags</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {opportunity.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {opportunity.description && (
                  <div className="mt-3 text-sm">
                    <p className="font-medium">Description</p>
                    <p className="text-muted-foreground">{opportunity.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isPast(date: Date): boolean {
  return date < new Date();
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}