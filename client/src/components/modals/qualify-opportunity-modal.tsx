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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Opportunity, User, Lead } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect } from "react";

const qualifyOpportunitySchema = z.object({
  status: z.enum(["closed won", "closed lost"], {
    required_error: "Please select a status",
  }),
});

type QualifyOpportunityFormData = z.infer<typeof qualifyOpportunitySchema>;

interface QualifyOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  lead?: Lead | null;
}

export function QualifyOpportunityModal({
  isOpen,
  onClose,
  opportunity,
  lead,
}: QualifyOpportunityModalProps) {
  const { toast } = useToast();

  const form = useForm<QualifyOpportunityFormData>({
    resolver: zodResolver(qualifyOpportunitySchema),
    defaultValues: {
      status: undefined,
    },
  });

  const { data: leadData } = useQuery({
    queryKey: ["/api/leads", opportunity?.leadId],
    queryFn: async () => {
      if (!opportunity?.leadId) return null;
      const response = await apiRequest(
        "GET",
        `/api/leads/${opportunity.leadId}`
      );
      return response.json();
    },
    enabled: isOpen && !lead && !!opportunity?.leadId,
  });

  const effectiveLead = lead || leadData;

  useEffect(() => {
    if (isOpen) {
      form.reset({
        status: undefined,
      });
    }
  }, [isOpen, form]);

  const qualifyOpportunityMutation = useMutation({
    mutationFn: async (data: QualifyOpportunityFormData) => {
      if (!opportunity) throw new Error("No opportunity selected");

      let customerId = opportunity.customerId;
      let contactId = opportunity.associatedContact;

      console.log("Starting opportunity qualification:", {
        opportunityId: opportunity.id,
        currentCustomerId: customerId,
        currentContactId: contactId,
        leadId: effectiveLead?.id,
        hasLead: !!effectiveLead,
        status: data.status,
      });

      if (
        data.status === "closed won" &&
        (!customerId || !contactId) &&
        effectiveLead
      ) {
        if (!customerId) {
          try {
            const customerData = {
              companyName: effectiveLead.companyName || opportunity.name,
              email: effectiveLead.email || "",
              phone: effectiveLead.phone || "",
              website: effectiveLead.websiteUrl || "",
              country: effectiveLead.countryRegion || "",
              timeZone: effectiveLead.timeZone || "",
              notes: effectiveLead.notes || opportunity.description || "",
              assignedUserId: opportunity.assignedUserId,
              assignedUserName: opportunity.assignedUserName,
              contactName: `${effectiveLead.pointOfContactFirstName || ""} ${
                effectiveLead.pointOfContactLastName || ""
              }`.trim(),
              contactEmail: effectiveLead.email || "",
              createdByUserId: effectiveLead.createdByUserId || "",
              createdByUserName: effectiveLead.createdByUserName || "",
              status: "active",
            };

            console.log("Creating customer with data:", customerData);

            const customerResponse = await apiRequest(
              "POST",
              "/api/customers",
              customerData
            );
            if (!customerResponse.ok) {
              const errorText = await customerResponse.text();
              throw new Error(`Failed to create customer: ${errorText}`);
            }

            const customer = await customerResponse.json();
            console.log("Customer created:", customer);
            customerId = customer.id;
          } catch (error: any) {
            console.error("Error creating customer:", error);
            throw new Error(`Customer creation failed: ${error.message}`);
          }
        }

        if (!contactId && customerId) {
          try {
            const contactData = {
              firstName: effectiveLead.pointOfContactFirstName || "",
              lastName: effectiveLead.pointOfContactLastName || "",
              email: effectiveLead.email || "",
              phone: effectiveLead.phone || "",
              companyId: customerId,
              companyName: effectiveLead.companyName || opportunity.name,
              websiteUrl: effectiveLead.websiteUrl || "",
              countryRegion: effectiveLead.countryRegion || "",
              timeZone: effectiveLead.timeZone || "",
              assignedUserId: opportunity.assignedUserId,
              assignedUserName: opportunity.assignedUserName,
              isActive: true,
            };

            console.log("Creating contact with data:", contactData);

            const contactResponse = await apiRequest(
              "POST",
              "/api/contacts",
              contactData
            );
            if (!contactResponse.ok) {
              const errorText = await contactResponse.text();
              throw new Error(`Failed to create contact: ${errorText}`);
            }

            const contact = await contactResponse.json();
            console.log("Contact created:", contact);
            contactId = contact.id;
          } catch (error: any) {
            console.error("Error creating contact:", error);
            throw new Error(`Contact creation failed: ${error.message}`);
          }
        }

        if (effectiveLead && customerId && contactId) {
          try {
            console.log("Updating lead with customerId and contactId:", {
              customerId,
              contactId,
            });
            const leadResponse = await apiRequest(
              "PUT",
              `/api/leads/${effectiveLead.id}`,
              {
                customerId,
                contactId,
              }
            );

            if (!leadResponse.ok) {
              const errorText = await leadResponse.text();
              console.error("Failed to update lead:", errorText);
            }
          } catch (error) {}
        }
      }

      const updateData: any = {
        stage: data.status === "closed won" ? "closed won" : "closed lost",
        actualCloseDate: new Date().toISOString(),
        isClosedWon: data.status === "closed won",
        isClosedLost: data.status === "closed lost",
        isDealClosed: true,
      };

      if (customerId) updateData.customerId = customerId;
      if (contactId) updateData.associatedContact = contactId;

      const opportunityResponse = await apiRequest(
        "PUT",
        `/api/opportunities/${opportunity.id}`,
        updateData
      );
      if (!opportunityResponse.ok) {
        const errorText = await opportunityResponse.text();
        throw new Error(`Failed to update opportunity: ${errorText}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Opportunity has been closed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to close opportunity.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: QualifyOpportunityFormData) => {
    await qualifyOpportunityMutation.mutateAsync(data);
  };

  if (!opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Close Opportunity</DialogTitle>
          <DialogDescription>
            Update the status of "{opportunity.name}" to closed won or closed
            lost.
            {effectiveLead &&
              " A customer and contact will be created if closed won."}
            {!effectiveLead &&
              " No lead data available for customer/contact creation."}
          </DialogDescription>
          <div className="text-sm text-muted-foreground mt-2">
            Current Status:{" "}
            <span className="font-medium">
              {opportunity.stage || "Not set"}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              onValueChange={(value) => {
                form.setValue("status", value as "closed won" | "closed lost");
                if (value === "closed won") {
                  form.setValue("status", "closed won");
                } else if (value === "closed lost") {
                  form.setValue("status", "closed lost");
                }
              }}
              value={form.watch("status") || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="closed won">Closed Won</SelectItem>
                <SelectItem value="closed lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>

            {form.formState.errors.status && (
              <p className="text-sm text-red-600">
                {form.formState.errors.status.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={qualifyOpportunityMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={qualifyOpportunityMutation.isPending}
            >
              {qualifyOpportunityMutation.isPending
                ? "Closing..."
                : "Close Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
