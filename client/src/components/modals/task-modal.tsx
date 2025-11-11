import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  insertTaskSchema,
  Task,
  User,
  Lead,
  Customer,
  Opportunity,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useUserStore, useRoleStore } from "@/stores/useRoleStore";
import {
  Search,
  UserIcon,
  Building,
  Briefcase,
  User as UserIcon2,
} from "lucide-react";

type TaskFormData = z.infer<typeof insertTaskSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
}

export function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  useEffect(() => {
    if (isOpen) {
      form.reset({
        ...task,
        attachments: task?.attachments || [],
      });
    }
  }, [isOpen, task]);

  const { toast } = useToast();
  const [AllowedAssignTask, setAllowedAssignTask] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [leadSearch, setLeadSearch] = useState("");
  const { user } = useAuth();
  const isEditing = !!task;

  const userId = useUserStore((state) => state.user?.id);
  const userrole = useRoleStore((state) => state.role);
  useEffect(() => {
    if (
      userrole?.permissions?.includes("all") ||
      userrole?.permissions?.includes("assign_tasks")
    ) {
      setAllowedAssignTask(true);
    } else {
      setAllowedAssignTask(false);
    }
  }, [userrole]);

  const { data: assignableUsers = [] } = useQuery<User[]>({
    queryKey: ["assignable-users", userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assignable-users/${userId}?role=${userrole?.name}`
      );
      if (!res.ok) throw new Error("Failed to fetch assignable users");
      return res.json();
    },
    enabled: isOpen && !!userId && !!userrole?.name,
  });

  // const { data: leads = [] } = useQuery<Lead[]>({
  //   queryKey: ["/api/leads"],
  //   enabled: isOpen,
  // });

  // const { data: customers } = useQuery<{
  //   result: Customer[];
  //   totalcount: number;
  // }>({
  //   queryKey: ["/api/customers"],
  //   enabled: isOpen,
  // });

  // const { data: opportunities = [] } = useQuery<Opportunity[]>({
  //   queryKey: ["/api/opportunities"],
  //   enabled: isOpen,
  // });

  const { data: taskDataa, isLoading } = useQuery<{
    success: boolean;
    result: {
      leads: Lead[];
      customers: Customer[];
      opportunities: Opportunity[];
    };
    message: string;
  }>({
    queryKey: ["/api/task-data", userId],
    queryFn: async () => {
      const res = await fetch(`/api/task-data/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch task data");
      return res.json();
    },
    enabled: !!userId && isOpen, // only fetch when modal is open and userId exists
  });

  // console.log("Task Data : ", taskDataa);
  let leads: Lead[] = [];
  let customers: Customer[] = [];
  let opportunities: Opportunity[] = [];

  if (taskDataa?.success) {
    ({ leads, customers, opportunities } = taskDataa.result);
  }
  const formatCustomerName = (customer: Customer) => {
    const company = customer.companyName || "-";
    return `${company}`;
  };

  // console.log("Customers : ", customers);
  // console.log("Opportunities : ", opportunities);

  const formatLeadName = (lead: Lead) => {
    const name = lead.name || "-";
    const email = lead.email || "No email";
    const company = lead.companyName || "No company";
    return `${name} (${email}) - ${company}`;
  };

  // const opportunities = opportunities;
  // const customers = customers;
  // const leads = leads;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      dueDate: "",
      assignedUserId: user?.id,
      createdByUserId: user?.id,
      leadId: undefined,
      customerId: undefined,
      opportunityId: undefined,
      duration: 0,
      attachments: [],
      labels: [],
      effort: 0,
      dependencies: "",
      notes: "",
      checklist: [],
    },
  });
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: task?.title || "",
        description: task?.description || "",
        status: task?.status || "pending",
        priority: task?.priority || "medium",
        dueDate: task?.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        assignedUserId: task?.assignedUserId || user?.id,
        createdByUserId: task?.createdByUserId || user?.id,
        leadId: task?.leadId || undefined,
        customerId: task?.customerId || undefined,
        opportunityId: task?.opportunityId || undefined,

        // 👇 include these extra ones to preserve data
        duration: task?.duration || 0,
        effort: task?.effort || 0,
        dependencies: task?.dependencies || "",
        notes: task?.notes || "",
        checklist: task?.checklist || [],
        labels: task?.labels || [],
        attachments: task?.attachments || [],
      });
    }
  }, [isOpen, task, user, form]);

  const validateDueDate = (value: string | null | undefined) => {
    if (!value) return true;
    const dueDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate >= today || "Due date must be in the future";
  };

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const sanitizedData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        leadId: data.leadId || null,
        customerId: data.customerId || null,
        opportunityId: data.opportunityId || null,
      };
      const res = await apiRequest("POST", "/api/tasks", sanitizedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Task created",
        description: "The task has been successfully created.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create task.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const sanitizedData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        leadId: data.leadId || null,
        customerId: data.customerId || null,
        opportunityId: data.opportunityId || null,
        attachments: data.attachments, // 🔹 current attachments
      };

      const res = await apiRequest(
        "PUT",
        `/api/tasks/${task!.id}`,
        sanitizedData
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Task updated",
        description: "The task has been successfully updated.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (fileUrl: string) => {
      const encodedUrl = encodeURIComponent(fileUrl);
      const res = await fetch(
        `/api/tasks/${task!.id}/attachments?fileUrl=${encodedUrl}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete attachment");
      }
      return fileUrl;
    },
    onSuccess: (fileUrl) => {
      // Update local form
      const currentAttachments = form.watch("attachments") || [];
      form.setValue(
        "attachments",
        currentAttachments.filter((f) => f !== fileUrl)
      );

      // Update cached task object
      queryClient.setQueryData<Task[]>(
        ["/api/tasks"],
        (old) =>
          old?.map((t) =>
            t.id === task!.id
              ? {
                  ...t,
                  attachments: t.attachments!.filter((f) => f !== fileUrl),
                }
              : t
          ) || []
      );

      // Update single task cache if you have it
      queryClient.setQueryData<Task>(
        ["/api/tasks", task!.id],
        (old) =>
          old && {
            ...old,
            attachments: old.attachments!.filter((f) => f !== fileUrl),
          }
      );

      toast({
        title: "Attachment deleted",
        description: "The attachment was successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete attachment.",
        variant: "destructive",
      });
    },
  });

  function validateData(data: TaskFormData) {
    let isValid = true;
    if (!data.title.trim()) {
      form.setError("title", { message: "title is required." });
      isValid = false;
    } else if (!data.assignedUserId) {
      form.setError("assignedUserId", {
        message: "assignedUserId is required.",
      });
      isValid = false;
    }
    return isValid;
  }

  const handleSubmit = async (data: TaskFormData) => {
    if (!validateData(data)) return;

    try {
      const formData = new FormData();

      // Combine existing attachments and newly uploaded files
      const finalAttachments = [
        ...(data.attachments || []), // existing attachments
        ...uploadedFiles, // new files
      ];

      // Append all fields
      for (const key in data) {
        if (key === "attachments") continue; // skip attachments for now
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          if (typeof value === "object") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        }
      }

      // Append attachments
      finalAttachments.forEach((fileOrUrl) => {
        // If it's a File object, append directly
        if (fileOrUrl instanceof File) {
          formData.append("attachments", fileOrUrl);
        } else if (typeof fileOrUrl === "string") {
          formData.append("attachments", fileOrUrl);
        }
      });

      if (isEditing) {
        await apiRequest("PUT", `/api/tasks/${task!.id}`, formData, true);
        toast({
          title: "Task updated",
          description: "Task updated successfully",
        });
      } else {
        await apiRequest("POST", "/api/tasks", formData, true);
        toast({
          title: "Task created",
          description: "Task created successfully",
        });
      }

      // Reset uploaded files after submission
      setUploadedFiles([]);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAttachment = async (fileUrl: string) => {
    try {
      setDeletingFile(fileUrl); // mark this file as deleting
      await deleteAttachmentMutation.mutateAsync(fileUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingFile(null); // reset
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update task information below."
              : "Create a new task and assign it to team members."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              {...form.register("title", { required: "Title is required" })}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="description">Description</Label>
            <div className="relative">
              <Textarea
                id="description"
                placeholder="Enter task description"
                maxLength={500}
                {...form.register("description", {
                  maxLength: {
                    value: 500,
                    message: "Description cannot exceed 500 characters",
                  },
                })}
                className="pr-14" // padding to avoid overlap
              />
              {/* Live character counter */}
              <span
                className={`absolute bottom-2 right-3 text-xs ${
                  (form.watch("description")?.length || 0) > 500
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {form.watch("description")?.length || 0}/500
              </span>
            </div>
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value) => form.setValue("status", value)}
                value={form.watch("status") ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                onValueChange={(value) => form.setValue("priority", value)}
                value={form.watch("priority") ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                {...form.register("dueDate", {
                  validate: validateDueDate,
                })}
              />
              {form.formState.errors.dueDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.dueDate.message}
                </p>
              )}
            </div>
          </div>

          {AllowedAssignTask && (
            <div className="space-y-2">
              <Label htmlFor="assignedUserId">Assign To *</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("assignedUserId", parseInt(value))
                }
                value={form.watch("assignedUserId")?.toString() || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="none"
                    className="text-muted-foreground italic"
                  >
                    — Unassigned —
                  </SelectItem>
                  {assignableUsers
                    ?.filter((user: any) => user.isActive)
                    ?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.assignedUserId && (
                <p className="text-sm text-red-600">
                  {"Assign to is required"}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <Label>Related To (Optional)</Label>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadId">Related Lead</Label>
                <Select
                  onValueChange={(value) =>
                    form.setValue(
                      "leadId",
                      value === "none" ? undefined : parseInt(value)
                    )
                  }
                  value={form.watch("leadId")?.toString() || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <div className="relative px-2 py-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search leads..."
                        className="pl-9"
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectItem value="none">No lead</SelectItem>
                    <div className="max-h-48 overflow-y-auto">
                      {leads
                        ?.filter((lead) => lead.status !== "qualified")
                        .map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">
                                {formatLeadName(lead)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerId">Related Customer</Label>
                <Select
                  onValueChange={(value) =>
                    form.setValue(
                      "customerId",
                      value === "none" ? undefined : parseInt(value)
                    )
                  }
                  value={form.watch("customerId")?.toString() || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <div className="relative px-2 py-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customers..."
                        className="pl-9"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectItem value="none">No customer</SelectItem>
                    <div className="max-h-48 overflow-y-auto">
                      {customers?.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={customer.id.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              {formatCustomerName(customer)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opportunityId">Related Opportunity</Label>
                <Select
                  onValueChange={(value) =>
                    form.setValue(
                      "opportunityId",
                      value === "none" ? undefined : parseInt(value)
                    )
                  }
                  value={form.watch("opportunityId")?.toString() || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Opportunity" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <div className="relative px-2 py-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search Opportunity..."
                        className="pl-9"
                        value={opportunitySearch}
                        onChange={(e) => setOpportunitySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectItem value="none">No opportunity</SelectItem>
                    <div className="max-h-48 overflow-y-auto">
                      {opportunities
                        ?.filter(
                          (opportunity) =>
                            opportunity.stage !== "closed won" &&
                            opportunity.stage !== "closed lost"
                        )
                        .map((opportunity) => (
                          <SelectItem
                            key={opportunity.id}
                            value={opportunity.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">
                                {opportunity.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid">
            {/* --- Additional Task Details (Checklist 0/7) --- */}
            <div className="space-y-4 mt-6">
              <Label className="font-semibold text-gray-700">
                Additional Task Details
              </Label>

              {/* Duration */}
              {/* <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={0}
                  defaultValue={0}
                  placeholder="Enter duration in hours"
                  {...form.register("duration", { valueAsNumber: true })}
                />
              </div> */}

              {/* Attachments Upload Section */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="attachments">Upload Attachments</Label>

                  {/* File input (can select multiple) */}
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    className="cursor-pointer"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setUploadedFiles((prev) => [
                          ...prev,
                          ...Array.from(files),
                        ]);
                      }
                    }}
                  />

                  {/* Show selected (new) files */}
                  {uploadedFiles.length > 0 && (
                    <ul className="text-sm text-gray-600 list-disc pl-5">
                      {uploadedFiles.map((file, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span>{file.name}</span>
                          <button
                            type="button"
                            className="ml-2 text-red-500 hover:text-red-700 text-xs"
                            onClick={() =>
                              setUploadedFiles((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Show existing files in edit mode */}
                  {(form.watch("attachments") || []).length > 0 && (
                    <ul className="text-sm text-gray-600 list-disc pl-5">
                      {form.watch("attachments")!.map((fileUrl, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between gap-2 my-2"
                        >
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline truncate"
                          >
                            {fileUrl.split("/").pop()}
                          </a>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleDeleteAttachment(fileUrl)}
                            disabled={deletingFile === fileUrl}
                          >
                            {deletingFile === fileUrl
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Labels */}
              {/* Labels */}
              <div className="space-y-2">
                <Label htmlFor="labels">Tags</Label>

                <div className="flex gap-2">
                  <Input
                    id="labels"
                    placeholder="Enter a label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const label = newLabel.trim();
                        if (label) {
                          const currentLabels = form.watch("labels") || [];
                          if (!currentLabels.includes(label)) {
                            form.setValue("labels", [...currentLabels, label]);
                          }
                          setNewLabel(""); // reset input
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const label = newLabel.trim();
                      if (label) {
                        const currentLabels = form.watch("labels") || [];
                        if (!currentLabels.includes(label)) {
                          form.setValue("labels", [...currentLabels, label]);
                        }
                        setNewLabel(""); // reset input
                      }
                    }}
                  >
                    + Add
                  </Button>
                </div>

                {/* Display Labels as Chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.watch("labels") || []).map((label, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{label}</span>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          const updated = (form.watch("labels") || []).filter(
                            (_, i) => i !== index
                          );
                          form.setValue("labels", updated);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Effort */}
              {/* <div className="space-y-2">
                <Label htmlFor="effort">Effort (hours)</Label>
                <Input
                  id="effort"
                  type="number"
                  min={0}
                  defaultValue={0}
                  placeholder="Estimated effort hours"
                  {...form.register("effort", { valueAsNumber: true })}
                />
              </div> */}

              {/* Dependencies */}
              <div className="space-y-2">
                <Label htmlFor="dependencies">Dependencies</Label>
                <Input
                  id="dependencies"
                  placeholder="Enter dependent task IDs or names"
                  {...form.register("dependencies")}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add additional notes or context"
                  {...form.register("notes")}
                />
              </div>

              {/* Checklist */}
              {/* Checklist */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Checklist</Label> {/* Add Item Button */}
                  <Button
                    type="button"
                    size="sm"
                    className="flex justify-self-end"
                    onClick={() =>
                      form.setValue("checklist", [
                        ...(form.watch("checklist") || []),
                        { item: "", status: "pending" },
                      ])
                    }
                  >
                    + Add item
                  </Button>
                </div>

                {form.watch("checklist")?.map((entry, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-2  justify-between"
                  >
                    {/* Checklist Item Input */}
                    <Input
                      value={entry.item}
                      onChange={(e) => {
                        const updated = [...(form.watch("checklist") || [])];
                        updated[index] = {
                          ...updated[index],
                          item: e.target.value,
                        };
                        form.setValue("checklist", updated);
                      }}
                      placeholder={`Checklist item ${index + 1}`}
                      className="flex-1"
                    />

                    {/* Status Dropdown */}
                    <Select
                      value={entry.status}
                      onValueChange={(value) => {
                        const updated = [...(form.watch("checklist") || [])];
                        updated[index] = {
                          ...updated[index],
                          status: value as "pending" | "in_progress" | "done",
                        };
                        form.setValue("checklist", updated);
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        const updated = form
                          .watch("checklist")
                          ?.filter((_, i) => i !== index);
                        form.setValue("checklist", updated);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Task"
                : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
