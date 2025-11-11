import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useUserStore } from "@/stores/useRoleStore";
import React, { useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import {
  // Lead,
  // Opportunity,
  // Contact,
  insertMeetingSchema,
} from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const meetingFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    startTime: z
      .string()
      .min(1, "Start time required")
      .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date format"),
    endTime: z
      .string()
      .min(1, "End time required")
      .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date format"),
    location: z.string().optional().nullable(),
    attendees: z
      .array(z.string().min(1, "Attendee name is required"))
      .default([]),
    organizedByUserId: z.number(),
    leadId: z.number().nullable().optional(),
    contactId: z.number().nullable().optional(),
    opportunityId: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const now = new Date();
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (start < now) {
      ctx.addIssue({
        path: ["startTime"],
        code: "custom",
        message: "Meeting cannot start in the past",
      });
    }
    if (end <= start) {
      ctx.addIssue({
        path: ["endTime"],
        code: "custom",
        message: "End time must be after start time",
      });
    }
  });

type MeetingFormData = z.infer<typeof meetingFormSchema>;

// Interface for the data we actually send to the server
interface MeetingSubmissionData {
  title: string;
  description?: string | null;
  startTime: string; // Keep as string, server will convert
  endTime: string; // Keep as string, server will convert
  location?: string | null;
  attendees: string[];
  organizedByUserId: number;
  leadId?: number | null;
  contactId?: number | null;
  opportunityId?: number | null;
}

interface AddMeetingModelProps {
  isOpen: boolean;
  onClose: () => void;
  meeting?: {
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
  };
}

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  probability: number;
  companyName: string | null;
  assignedUserName: string | null;
}

interface Opportunity {
  id: number;
  name: string;
  value: number;
  stage: string;
  companyName: string | null;
  assignedUserName: string | null;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  assignedUserName: string | null;
}

interface RelatedDataResponse {
  success: boolean;
  message: string;
  data: {
    leads: Lead[];
    opportunities: Opportunity[];
    contacts: Contact[];
  };
}

export function AddMeetingModel({
  isOpen,
  onClose,
  meeting,
}: AddMeetingModelProps) {
  const { toast } = useToast();
  const userId = useUserStore((state) => state.user?.id);

  const { data, isLoading, isError } = useQuery<RelatedDataResponse>({
    queryKey: ["/api/related-data"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/related-data");
      return response.json();
    },
    enabled: !!isOpen, // Fetch only when modal/dialog is open
  });

  // --- Safe extractions using Array.isArray ---
  const leads = Array.isArray(data?.data?.leads) ? data.data.leads : [];

  const opportunities = Array.isArray(data?.data?.opportunities)
    ? data.data.opportunities
    : [];
  const contacts = Array.isArray(data?.data?.contacts)
    ? data.data.contacts
    : [];

  // const { data: leads = [], isLoading: isLoadingLeads } = useQuery<Lead[]>({
  //   queryKey: ["leads"],
  //   queryFn: async () => {
  //     const response = await apiRequest("GET", "/api/leads");
  //     return response.json();
  //   },
  //   enabled: !!isOpen, // <-- This is the fix
  // });

  // const { data: opportunities = [], isLoading: isLoadingOpportunities } =
  //   useQuery<Opportunity[]>({
  //     queryKey: ["opportunities"],
  //     queryFn: async () => {
  //       const response = await apiRequest("GET", "/api/opportunities");
  //       return response.json();
  //     },
  //     enabled: !!isOpen, // <-- This is the fix
  //   });

  // const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<
  //   Contact[]
  // >({
  //   queryKey: ["contacts"],
  //   queryFn: async () => {
  //     const response = await apiRequest("GET", "/api/contacts");
  //     return response.json();
  //   },
  //   enabled: !!isOpen, // <-- This is the fix
  // });

  // useEffect(() => {
  //   // This code will run when leads, opportunities, or contacts change
  //   console.log("Leads from useEffect:", leads);
  //   console.log("Opportunities from useEffect:", opportunities);
  //   console.log("Contacts from useEffect:", contacts);
  // }, [leads, opportunities, contacts]); // The "dependency array"

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      attendees: [],
      organizedByUserId: userId || 0,
      leadId: null,
      contactId: null,
      opportunityId: null,
    },
  });

  // Separate mutation for creating meetings
  const createMeetingMutation = useMutation({
    mutationFn: async (data: MeetingSubmissionData) => {
      const response = await apiRequest("POST", "/api/meetings", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create meeting");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({
        title: "Meeting created successfully!",
      });
      resetFormToDefaults();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating meeting",
        description: "Invalid Meeting Data",
        variant: "destructive",
      });
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async (data: MeetingSubmissionData) => {
      if (!meeting?.id) {
        throw new Error("Meeting ID is required for update");
      }
      const response = await apiRequest(
        "PUT",
        `/api/meetings/${meeting.id}`,
        data
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update meeting");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({
        title: "Meeting updated successfully!",
      });
      resetFormToDefaults();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating meeting",
        description: "Invalid Meeting Data",
        variant: "destructive",
      });
    },
  });

  const sanitizeDataForCreate = (
    data: MeetingFormData
  ): MeetingSubmissionData => {
    return {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location?.trim() || null,
      attendees: Array.isArray(data.attendees) ? data.attendees : [],
      organizedByUserId: data.organizedByUserId,
      leadId: data.leadId || undefined,
      contactId: data.contactId || undefined,
      opportunityId: data.opportunityId || undefined,
    };
  };

  const sanitizeDataForUpdate = (
    data: MeetingFormData
  ): MeetingSubmissionData => {
    return {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location?.trim() || null,
      attendees: Array.isArray(data.attendees) ? data.attendees : [],
      organizedByUserId: data.organizedByUserId,
      leadId: data.leadId || undefined,
      contactId: data.contactId || undefined,
      opportunityId: data.opportunityId || undefined,
    };
  };

  const handleCreateMeeting = (data: MeetingFormData) => {
    const sanitizedData = sanitizeDataForCreate(data);
    createMeetingMutation.mutate(sanitizedData);
  };

  const handleUpdateMeeting = (data: MeetingFormData) => {
    const sanitizedData = sanitizeDataForUpdate(data);
    updateMeetingMutation.mutate(sanitizedData);
  };

  const onSubmit = (data: MeetingFormData) => {
    if (meeting) {
      handleUpdateMeeting(data);
    } else {
      handleCreateMeeting(data);
    }
  };

  const resetFormToDefaults = () => {
    form.reset({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      attendees: [],
      organizedByUserId: userId || 0,
      leadId: null,
      contactId: null,
      opportunityId: null,
    });
  };

  const populateFormForEdit = (meetingData: NonNullable<typeof meeting>) => {
    form.reset({
      title: meetingData.title,
      description: meetingData.description || "",
      startTime: new Date(meetingData.startTime).toISOString().slice(0, 16),
      endTime: new Date(meetingData.endTime).toISOString().slice(0, 16),
      location: meetingData.location || "",
      attendees: meetingData.attendees || [],
      organizedByUserId: meetingData.organizedByUserId,
      leadId: meetingData.leadId || null,
      contactId: meetingData.contactId || null,
      opportunityId: meetingData.opportunityId || null,
    });
  };

  useEffect(() => {
    if (meeting) {
      populateFormForEdit(meeting);
    } else {
      resetFormToDefaults();
    }
  }, [meeting, userId, isOpen]);
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const currentMutation = meeting
    ? updateMeetingMutation
    : createMeetingMutation;
  const isPending = currentMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit Meeting" : "Add Meeting"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 pl-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pb-4"
          >
            <div>
              <Label>Title*</Label>
              <Input {...form.register("title")} placeholder="Meeting Title" />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="meetingDescription">Description</Label>
              <div className="relative">
                <Input
                  id="meetingDescription"
                  placeholder="Optional description"
                  maxLength={200} // prevent typing beyond 200 characters
                  {...form.register("description", {
                    maxLength: {
                      value: 200,
                      message: "Description cannot exceed 200 characters",
                    },
                  })}
                  className="pr-14"
                />
                {/* Live character counter */}
                <span
                  className={`absolute bottom-2 right-3 text-xs ${
                    (form.watch("description")?.length || 0) >= 200
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {form.watch("description")?.length || 0}/200
                </span>
              </div>
              {form.formState.errors.description && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Time*</Label>
                <Input type="datetime-local" {...form.register("startTime")} />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>
              <div>
                <Label>End Time*</Label>
                <Input type="datetime-local" {...form.register("endTime")} />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.endTime.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Meeting Link</Label>
              <Input
                {...form.register("location")}
                placeholder={"Add Meet Link Here"}
              />
            </div>
            <div>
              <Label>Attendees</Label>
              <Input
                placeholder="Enter attendee names separated by commas"
                defaultValue={form.watch("attendees")?.join(", ") || ""}
                onChange={(e) => {
                  const attendees = e.target.value
                    .split(",")
                    .map((attendee) => attendee.trim())
                    .filter((attendee) => attendee.length > 0);
                  form.setValue("attendees", attendees);
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Lead</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !form.watch("leadId") && "text-muted-foreground"
                      )}
                    >
                      {form.watch("leadId")
                        ? leads.find((lead) => lead.id === form.watch("leadId"))
                            ?.name || "No Name"
                        : "Select lead"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search leads..." />
                      <CommandList>
                        <ScrollArea className="h-64">
                          <CommandEmpty>No leads found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                form.setValue("leadId", null);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !form.watch("leadId")
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              None
                            </CommandItem>

                            {leads.map((lead) => (
                              <CommandItem
                                value={lead.name || "No Name"}
                                key={lead.id}
                                onSelect={() => {
                                  form.setValue("leadId", lead.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    lead.id === form.watch("leadId")
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {lead.name || "No Name"} (
                                {lead.email || "No Email"})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </ScrollArea>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Contact Dropdown */}
              <div className="space-y-2">
                <Label>Contact</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !form.watch("contactId") && "text-muted-foreground"
                      )}
                    >
                      {form.watch("contactId")
                        ? (() => {
                            const contact = contacts.find(
                              (c) => c.id === form.watch("contactId")
                            );
                            if (!contact) return "No Contact";
                            const firstName =
                              contact.firstName || "No First Name";
                            const lastName = contact.lastName || "No Last Name";
                            return `${firstName} ${lastName}`;
                          })()
                        : "Select contact"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search contacts..." />
                      <CommandList>
                        <ScrollArea className="h-64">
                          <CommandEmpty>No contacts found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                form.setValue("contactId", null);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !form.watch("contactId")
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              None
                            </CommandItem>

                            {contacts.map((contact) => {
                              const firstName =
                                contact.firstName || "No First Name";
                              const lastName =
                                contact.lastName || "No Last Name";
                              const email = contact.email || "No Email";
                              return (
                                <CommandItem
                                  value={`${firstName} ${lastName}`}
                                  key={contact.id}
                                  onSelect={() => {
                                    form.setValue("contactId", contact.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      contact.id === form.watch("contactId")
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {firstName} {lastName} ({email})
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </ScrollArea>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Opportunity Dropdown */}
              <div className="space-y-2">
                <Label>Opportunity</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !form.watch("opportunityId") && "text-muted-foreground"
                      )}
                    >
                      {form.watch("opportunityId")
                        ? (() => {
                            const op = opportunities.find(
                              (o) => o.id === form.watch("opportunityId")
                            );
                            return op?.name || "No Name";
                          })()
                        : "Select opportunity"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search opportunities..." />
                      <CommandList>
                        <ScrollArea className="h-64">
                          <CommandEmpty>No opportunities found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                form.setValue("opportunityId", null);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !form.watch("opportunityId")
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              None
                            </CommandItem>

                            {opportunities.map((op) => (
                              <CommandItem
                                value={op.name || "No Name"}
                                key={op.id}
                                onSelect={() => {
                                  form.setValue("opportunityId", op.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    op.id === form.watch("opportunityId")
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {op.name || "No Name"} -{" "}
                                {op.stage || "No Stage"}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </ScrollArea>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : meeting ? "Update" : "Save"}
              </Button>
            </DialogFooter>
            {/* Display all form errors */}
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following errors:
                </h4>
                <div className="space-y-1">
                  {Object.entries(form.formState.errors).map(
                    ([field, error]) => (
                      <div
                        key={field}
                        className="text-sm text-red-700 flex items-start"
                      >
                        <span className="font-medium capitalize mr-1">
                          {field.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span>{error?.message}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
