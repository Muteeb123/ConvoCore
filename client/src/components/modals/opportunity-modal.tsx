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
  insertOpportunitySchema,
  Opportunity,
  User,
  Lead,
  Customer,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect } from "react";
import { useState, useRef } from "react";
import {
  Search,
  UserIcon,
  Building,
  User as UserIcon2,
  Download,
  Trash2,
  X,
  Eye,
} from "lucide-react";
// Add these new lines with your other component imports:
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { cn } from "@/lib/utils";
import Leads from "@/pages/leads";
import { LeadViewModal } from "./view-lead-model";

const opportunityFormSchema = insertOpportunitySchema.extend({
  expectedCloseDate: z
    .string()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: "Invalid date format",
    })
    .nullable()
    .optional(),
  value: z.number().int().nonnegative(),
});

type OpportunityFormData = z.infer<typeof opportunityFormSchema>;

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
}

export function OpportunityModal({
  isOpen,
  onClose,
  opportunity,
}: OpportunityModalProps) {
  const { toast } = useToast();
  const [leadSearch, setLeadSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const isEditing = !!opportunity;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // --- ADD THESE LINES ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  // --- END ---
  const user = useUserStore((state) => state.user);
  const userId = user?.id;
  const userrole = useRoleStore((state) => state.role);

  const { data: assignableUsers = [] } = useQuery<User[]>({
    queryKey: ["assignable-users", userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assignable-users/${userId}?role=${userrole?.name}`
      );
      // console.log(`%cThe assignable users are : ${JSON.stringify(res)}`, "color: blue;");
      if (!res.ok) throw new Error("Failed to fetch assignable users");
      return res.json();
    },
    enabled: isOpen && !!userId && !!userrole?.name,
  });

  const { data: customers } = useQuery<{
    result: Customer[];
    totalcount: number;
  }>({
    queryKey: ["/api/customers"],
    enabled: isOpen,
  });
  const filteredCustomers = customers?.result;
  // console.log("Data Related id: ", opportunity?.id);
  const { data: oppdata } = useQuery({
    queryKey: ["/api/opportunities/relateddata", opportunity?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/opportunities/relateddata?oppId=${opportunity?.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch opportunity data");
      return res.json();
    },
    enabled: !!opportunity?.id, // only fetch when opportunity exists
  });

  // console.log("Data related to opportunity : ", oppdata);

  // console.log("*********the opportunity stage is : ", opportunity?.stage);

  // const { data: leads = [] } = useQuery<Lead[]>({
  //   queryKey: ["/api/leads"],
  //   enabled: isOpen,
  // });

  const { data: taskDataa, isLoading } = useQuery({
    queryKey: ["/api/task-data", userId],
    queryFn: async () => {
      const res = await fetch(`/api/task-data/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch task data");
      return res.json();
    },
    enabled: !!userId && isOpen, // only fetch when modal is open and userId exists
  });

  // console.log("Task Data : ", taskDataa);

  // Safely normalize all data to arrays
  // Convert lead, customer, and opportunity to arrays safely
  const leads = oppdata?.data?.lead
    ? Array.isArray(oppdata.data.lead)
      ? oppdata.data.lead
      : [oppdata.data.lead] // wrap single object in array
    : [];

  // const filteredCustomers = oppdata?.data?.customer
  //   ? Array.isArray(oppdata.data.customer)
  //     ? oppdata.data.customer
  //     : [oppdata.data.customer]
  //   : [];

  const opportunities = oppdata?.data?.opportunity
    ? Array.isArray(oppdata.data.opportunity)
      ? oppdata.data.opportunity
      : [oppdata.data.opportunity]
    : [];

  console.log("Leads:", leads);
  console.log("Customers:", filteredCustomers);
  console.log("Opportunities:", opportunities);
  // const filteredLeads = leads.filter((lead) => {
  //   const search = (leadSearch || "").toLowerCase().trim();

  //   // normalize all possible string fields safely
  //   const name = (lead?.name || "").toLowerCase();
  //   const email = (lead?.email || "").toLowerCase();
  //   const companyName = (lead?.companyName || "").toLowerCase();

  //   if (!search) return true; // if search is empty, show all

  //   return (
  //     name.includes(search) ||
  //     email.includes(search) ||
  //     companyName.includes(search)
  //   );
  // });

  const formatCustomerName = (customer: Customer) => {
    const company = customer.companyName || "-";
    return `${company}`;
  };

  const formatLeadName = (lead: Lead) => {
    const name = lead.name || "-";
    const email = lead.email || "No email";
    const company = lead.companyName || "No company";
    return `${name} (${email}) - ${company}`;
  };

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: "",
      description: "",
      value: 0,
      stage: "Initial Stage",
      expectedCloseDate: undefined,
      leadId: undefined,
      customerId: undefined,
      assignedUserId: null,
      isClosedLost: false,
      isClosedWon: false,
      isDealClosed: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: opportunity?.name || "",
        description: opportunity?.description || "",
        value: opportunity?.value || 0,
        stage: opportunity?.stage || "Initial Stage",
        expectedCloseDate: opportunity?.expectedCloseDate
          ? new Date(opportunity.expectedCloseDate).toISOString().split("T")[0]
          : "",
        leadId: opportunity?.leadId || undefined,
        customerId: opportunity?.customerId || undefined,
        assignedUserId: opportunity?.assignedUserId || null,
        isClosedLost: opportunity?.isClosedLost || false,
        isClosedWon: opportunity?.isClosedWon || false,
        isDealClosed: opportunity?.isDealClosed || false,
        createdByUserId: opportunity?.createdByUserId || userId || undefined,
      });
    }
  }, [opportunity, isOpen, form, userId]);

  const sanitizeData = (data: OpportunityFormData): any => {
    if (data.stage?.toLocaleLowerCase() === "lost") {
      data.isClosedLost = true;
      data.isClosedWon = false;
      data.isDealClosed = true;
    } else if (data.stage?.toLocaleLowerCase() === "closed") {
      data.isClosedLost = false;
      data.isClosedWon = true;
      data.isDealClosed = true;
    }
    return {
      name: data.name.trim(),
      description: data.description || null,
      value: Number(data.value) || 0,
      stage: data.stage || "prospecting",
      expectedCloseDate: data.expectedCloseDate
        ? new Date(data.expectedCloseDate)
        : null,
      leadId: data.leadId || null,
      customerId: data.customerId || null,
      assignedUserId: data.assignedUserId || null,
      isDealClosed: data.isDealClosed || false,
      isClosedLost: data.isClosedLost || false,
      isClosedWon: data.isClosedWon || false,
      createdByUserId: opportunity?.createdByUserId || userId || undefined,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data: OpportunityFormData) => {
      const formattedData = {
        ...data,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate).toISOString()
          : null,
      };
      const res = await apiRequest("POST", "/api/opportunities", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-pipeline"] });
      toast({
        title: "Opportunity created",
        description: "The opportunity has been successfully created.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create opportunity.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OpportunityFormData) => {
      const formattedData = {
        ...data,
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate).toISOString()
          : null,
      };
      console.log("Updating opportunity with data:", formattedData);
      const res = await apiRequest(
        "PUT",
        `/api/opportunities/${opportunity!.id}`,
        formattedData
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-pipeline"] });
      toast({
        title: "Opportunity updated",
        description: "The opportunity has been successfully updated.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update opportunity.",
        variant: "destructive",
      });
    },
  });

  function validateData(data: OpportunityFormData) {
    let isValid = true;

    if (!data.name.trim()) {
      form.setError("name", { message: "Name is required." });
      isValid = false;
    }
    if (data.value && isNaN(Number(data.value))) {
      form.setError("value", { message: "Value must be a number." });
      isValid = false;
    } else if (data.value && Number(data.value) < 0) {
      form.setError("value", { message: "Value must be positive." });
      isValid = false;
    }
    if (data.expectedCloseDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const closeDate = new Date(data.expectedCloseDate);

      if (isNaN(closeDate.getTime())) {
        form.setError("expectedCloseDate", {
          message: "Please enter a valid date",
        });
        isValid = false;
      } else if (closeDate < today && !isEditing) {
        form.setError("expectedCloseDate", {
          message: "Close date must be in the future.",
        });
        isValid = false;
      }
    }
    return isValid;
  }

  const handleSubmit = async (data: OpportunityFormData) => {
    if (!validateData(data)) {
      return;
    }
    console.log("Submitting opportunity data:", data);
    console.log("Sanitized opportunity data:", sanitizeData(data));
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(sanitizeData(data));
      } else {
        await createMutation.mutateAsync(sanitizeData(data));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // --- PASTE ALL THIS NEW CODE ---

  // Effect to clear file input on open
  useEffect(() => {
    if (isOpen) {
      setUploadedFiles([]); // clear files every time modal opens
    }
  }, [isOpen]);

  // Query to fetch existing files
  const { data: opportunityFiles, isLoading: isLoadingFiles } = useQuery({
    queryKey: ["/api/opportunity-files", opportunity?.id, userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/gcp-files?id=${opportunity?.id}&pre=opportunity`
      );
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!opportunity?.id && isEditing, // Only fetch if we are editing
  });

  // Mutation to upload new files
  const uploadFilesMutation = useMutation({
    mutationFn: async () => {
      if (!opportunity || uploadedFiles.length === 0) return;
      const formData = new FormData();
      formData.append("data", JSON.stringify(opportunity));
      uploadedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch(
        `/api/opportunities-with-files/${opportunity.id}`,
        {
          method: "PUT",
          body: formData,
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update opportunity with files");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Files uploaded",
        description: "Opportunity updated successfully with new files.",
      });
      setUploadedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Something went wrong while updating opportunity.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete existing files
  const deleteFileMutation = useMutation({
    mutationFn: async ({
      opportunityId,
      filePath,
    }: {
      opportunityId: number;
      filePath: string;
    }) => {
      setDeletingFile(filePath);
      const response = await fetch(`/api/opportunity-files/${opportunityId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
      return filePath;
    },
    onSuccess: (deletedPath) => {
      toast({
        title: "File deleted",
        description: "The file was removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-files"] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting file",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingFile(null);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Opportunity" : "Add New Opportunity"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update opportunity information below."
              : "Add a new opportunity to your pipeline."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 pl-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Opportunity Name *</Label>
              <Input
                id="name"
                placeholder="Enter opportunity name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="description">Description</Label>
              <div className="relative">
                <Textarea
                  id="description"
                  placeholder="Enter opportunity description"
                  maxLength={500} // prevents typing beyond 500
                  {...form.register("description", {
                    maxLength: {
                      value: 500,
                      message: "Description cannot exceed 500 characters",
                    },
                  })}
                  className="pr-14 min-h-[100px]"
                />
                {/* Live character counter */}
                <span
                  className={`absolute bottom-2 right-3 text-xs ${
                    (form.watch("description")?.length || 0) >= 500
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
                <Label htmlFor="value">Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...form.register("value", { valueAsNumber: true })}
                />
                {form.formState.errors.value && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.value.message}
                  </p>
                )}
              </div>
              {!opportunity?.isClosedWon && !opportunity?.isClosedLost ? (
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    onValueChange={(value) => form.setValue("stage", value)}
                    defaultValue={
                      form.watch("stage") ?? opportunity?.stage ?? undefined
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Always include current stage if it's not in the list */}
                      {opportunity?.stage &&
                        ![
                          // "prospecting",  {/* REMOVED */}
                          // "qualification", {/* REMOVED */}
                          "proposal",
                          "negotiation",
                        ].includes(opportunity.stage) && (
                          <SelectItem value={opportunity.stage}>
                            {opportunity.stage}
                          </SelectItem>
                        )}
                      {/* <SelectItem value="prospecting">Prospecting</SelectItem> */}{" "}
                      {/* REMOVED */}
                      {/* <SelectItem value="qualification"> */} {/* REMOVED */}
                      {/* Qualification */}
                      {/* </SelectItem> */}
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <input
                    type="text"
                    value={opportunity?.stage ?? "N/A"}
                    disabled
                    className="w-full border rounded p-2 bg-gray-100 text-gray-600"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                min={
                  !isEditing
                    ? new Date().toISOString().split("T")[0]
                    : undefined
                }
                {...form.register("expectedCloseDate")}
              />
              {form.formState.errors.expectedCloseDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.expectedCloseDate.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* --- MODIFIED "RELATED LEAD" BLOCK --- */}
              <div className="space-y-2">
                <Label htmlFor="leadId">Related Lead</Label>
                {/* Container classes changed to match SelectTrigger:
      - Removed: "p-3 rounded-xl bg-muted/30 justify-between"
      - Added: "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm gap-2"
    */}
                <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {form.watch("leadId") && leads?.length > 0 ? (
                    <>
                      {/* Item 1: The Eye Icon (unchanged) */}
                      <div className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-lg">
                        <Eye
                          className="w-4 h-4 cursor-pointer text-primary"
                          onClick={() => {
                            setSelectedLead(leads); // store lead in state
                            setIsViewModalOpen(true); // open modal
                          }}
                        />
                      </div>

                      {/* Item 2: The Name */}
                      <div>
                        {/* Added "truncate" to prevent text overflow */}
                        <p className="font-medium text-foreground truncate">
                          {leads.find(
                            (lead) => lead.id === form.watch("leadId")
                          )?.name || "Unknown Lead"}
                        </p>
                        {/* <p className="text-sm text-muted-foreground">
              {leads.find(
                (lead) => lead.id === form.watch("leadId")
              )?.email || "No email available"}
            </p> */}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No related lead selected
                    </p>
                  )}
                </div>
              </div>

              {/* --- "RELATED CUSTOMER" BLOCK (UNCHANGED) --- */}
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
                      {filteredCustomers?.map((customer) => (
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedUserId">Assigned To</Label>
              <Select
                onValueChange={(val) =>
                  form.setValue(
                    "assignedUserId",
                    val === "none" ? undefined : parseInt(val)
                  )
                }
                value={form.watch("assignedUserId")?.toString() || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="none"
                    className="text-muted-foreground italic"
                  >
                    — Unassigned —
                  </SelectItem>
                  {assignableUsers
                    .filter((user) => user.isActive)

                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <div className="space-y-4 pt-4 border-t">
                <Label>Documents ({opportunityFiles?.length || 0})</Label>

                {/* Upload section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="opportunityFiles">Upload New Files</Label>
                    <Input
                      id="opportunityFiles"
                      disabled={opportunity.stage === "closed won"}
                      type="file"
                      ref={fileInputRef}
                      multiple
                      className="cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files);
                          setUploadedFiles((prev) => [...prev, ...newFiles]);
                        }
                      }}
                    />
                  </div>

                  {/* Selected (not yet uploaded) files */}
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1 border rounded-md bg-gray-100 text-sm"
                        >
                          <span className="truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <button
                            type="button" // Prevent form submission
                            onClick={() =>
                              setUploadedFiles((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        type="button" // Prevent form submission
                        disabled={uploadFilesMutation.isPending}
                        onClick={() => {
                          if (uploadedFiles.length === 0) {
                            toast({
                              title: "No files selected",
                              description: "Please choose files to upload.",
                              variant: "destructive",
                            });
                            return;
                          }
                          uploadFilesMutation.mutate();
                        }}
                      >
                        {uploadFilesMutation.isPending
                          ? "Uploading..."
                          : "Upload"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Documents table (already uploaded files only) */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingFiles ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24">
                            Loading files...
                          </TableCell>
                        </TableRow>
                      ) : opportunityFiles?.length > 0 ? (
                        opportunityFiles?.map((file: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="truncate max-w-[200px]">
                              {file.name}
                            </TableCell>
                            <TableCell>{file.lastModified}</TableCell>
                            <TableCell>
                              {file.size
                                ? `${(file.size / 1024).toFixed(2)} KB`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      `/api/opportunity-files/${encodeURIComponent(
                                        file.path
                                      )}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  disabled={
                                    deletingFile === file.path ||
                                    opportunity.stage === "closed won"
                                  }
                                  onClick={() => {
                                    toast({
                                      title: "Confirm Deletion",
                                      description:
                                        "Are you sure you want to delete this file?",
                                      action: (
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            deleteFileMutation.mutate({
                                              opportunityId: opportunity!.id,
                                              filePath: file.path,
                                            });
                                          }}
                                        >
                                          {deletingFile === file.path
                                            ? "Deleting..."
                                            : "Delete"}
                                        </Button>
                                      ),
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center h-24">
                            No documents uploaded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  opportunity?.stage === "closed won"
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                  ? "Update Opportunity"
                  : "Create Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </div>
        <LeadViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          lead={leads?.[0] || null}
        />
      </DialogContent>
    </Dialog>
  );
}
