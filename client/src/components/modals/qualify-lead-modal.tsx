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
import { Lead, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { X } from "lucide-react";

// app.post("/api/customers",
const qualifyLeadSchema = z.object({
  expectedCloseDate: z.string().min(1, "Expected close date is required"),
  // assignedUserId: z.number().min(1, "Please select an assignee"),
  assignedUserId: z.number().optional(),
  notes: z.string().optional(),
  opportunityFiles: z.array(z.instanceof(File)).optional(),
});

type QualifyLeadFormData = z.infer<typeof qualifyLeadSchema>;

interface QualifyLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function QualifyLeadModal({
  isOpen,
  onClose,
  lead,
}: QualifyLeadModalProps) {
  const { toast } = useToast();

  const userId = useUserStore((state) => state.user?.id);
  const userrole = useRoleStore((state) => state.role);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

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

  const form = useForm<QualifyLeadFormData>({
    resolver: zodResolver(qualifyLeadSchema),
    defaultValues: {
      expectedCloseDate: "",
      assignedUserId: undefined,
      notes: "",
      opportunityFiles: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        expectedCloseDate: "",
        assignedUserId: undefined,
        notes: "",
        opportunityFiles: [],
      });
    }
  }, [isOpen, form]);
  //create mutation
  const qualifyLeadMutation = useMutation({
    mutationFn: async (data: QualifyLeadFormData) => {
      if (!lead) throw new Error("No lead selected");

      // 1️⃣ STEP 1 — Create the opportunity (without files)
      const opportunityData = {
        name: lead.name,
        description: data.notes
          ? `${lead.notes || ""}\n\nQualification Notes: ${data.notes}`
          : lead.notes || "",
        value: lead.value ? Number(lead.value) : 0,
        stage: "Initial Stage",
        expectedCloseDate: data.expectedCloseDate,
        assignedUserId: data.assignedUserId,
        leadId: lead.id,
        customerId: lead.customerId,
        associatedContact: lead.contactId,
        tags: lead.tags,
        source: lead.source,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUserId: userId,
      };

      const createResponse = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opportunityData),
      });

      if (!createResponse.ok) throw new Error("Failed to create opportunity");
      const createdOpportunity = await createResponse.json();

      // 2️⃣ STEP 2 — Upload files (if any)
      if (selectedFiles.length > 0) {
        const fileFormData = new FormData();
        fileFormData.append("data", JSON.stringify(createdOpportunity));
        selectedFiles.forEach((file) => fileFormData.append("files", file));

        const uploadResponse = await fetch(
          `/api/opportunities-with-files/${createdOpportunity.id}`,
          {
            method: "PUT",
            body: fileFormData,
          }
        );

        if (!uploadResponse.ok)
          throw new Error("Opportunity created but file upload failed");

        const updatedOpportunity = await uploadResponse.json();

        // 3️⃣ STEP 3 — Update lead status after successful upload
        await apiRequest("PUT", `/api/leads/${lead.id}`, {
          status: "qualified",
          notes: data.notes
            ? `${
                lead.notes || ""
              }\n\nQualified on ${new Date().toLocaleDateString()}: ${
                data.notes
              }`
            : lead.notes,
        });

        return updatedOpportunity;
      }

      // 4️⃣ STEP 4 — Update lead status (no files case)
      await apiRequest("PUT", `/api/leads/${lead.id}`, {
        status: "qualified",
        notes: data.notes
          ? `${
              lead.notes || ""
            }\n\nQualified on ${new Date().toLocaleDateString()}: ${data.notes}`
          : lead.notes,
      });

      return createdOpportunity;
    },

    onSuccess: () => {
      setSelectedFiles([]);
      toast({
        title: "Success",
        description: "Lead has been qualified and converted to opportunity.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      onClose();
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to qualify lead.",
        variant: "destructive",
      });
    },
  });
  useEffect(() => {
    setSelectedFiles([]);
  }, [isOpen]);

  const handleSubmit = async (data: QualifyLeadFormData) => {
    await qualifyLeadMutation.mutateAsync(data);
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Qualify Lead</DialogTitle>
          <DialogDescription>
            Convert "{lead.name}" to an opportunity. The lead will remain in the
            database with status "qualified".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Expected Close Date *</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              {...form.register("expectedCloseDate")}
            />
            {form.formState.errors.expectedCloseDate && (
              <p className="text-sm text-red-600">
                {form.formState.errors.expectedCloseDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedUserId">Assigned To</Label>
            {/* <Select
              onValueChange={(value) => form.setValue("assignedUserId", parseInt(value))}
              value={form.watch("assignedUserId")?.toString() || ""}
            > */}
            <Select
              onValueChange={(value) => {
                // <-- CHANGED
                const num = parseInt(value);
                form.setValue("assignedUserId", isNaN(num) ? undefined : num);
              }}
              value={form.watch("assignedUserId")?.toString() || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers
                  .filter((user) => user.isActive)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assignedUserId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.assignedUserId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="files">Upload Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={(e) =>
                setSelectedFiles(Array.from(e.target.files || []))
              }
              className="cursor-pointer"
            />

            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-medium">Files to upload:</p>
                <ul className="list-disc ml-5 text-sm text-gray-700">
                  {selectedFiles.map((file, index) => (
                    <div className="flex justify-between">
                      <li key={index}>{file.name}</li>
                      <X
                        size={16}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        onClick={() => removeSelectedFile(index)}
                      />
                    </div>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this qualification..."
              {...form.register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={qualifyLeadMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={qualifyLeadMutation.isPending}>
              {qualifyLeadMutation.isPending ? "Qualifying..." : "Qualify Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
