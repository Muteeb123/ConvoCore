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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  insertLeadSchema,
  Lead,
  User,
  Customer,
  Contact,
  Role,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/useRoleStore";
import { Switch } from "@/components/ui/switch";
import { useUserStore } from "@/stores/useRoleStore";

type LeadFormData = z.infer<typeof insertLeadSchema>;

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
}

export function LeadModal({ isOpen, onClose, lead }: LeadModalProps) {
  const { toast } = useToast();
  const isEditing = !!lead;
  const [inputValue, setInputValue] = useState("");
  const [tags, setTags] = useState<string[]>(lead?.tags || []);
  const [isAssignLeadAllowed, setIsAssignLeadAllowed] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(
    !!lead?.customerId
  );
  const [isExistingContact, setIsExistingContact] = useState(!!lead?.contactId);
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    number | undefined
  >(lead?.customerId || undefined);
  const [selectedContactId, setSelectedContactId] = useState<number | undefined>(undefined);
  const [timeZones, setTimeZones] = useState<
    { value: string; text: string; utc: string[] }[]
  >([]);
  const [isFileUploadEnabled, setIsFileUploadEnabled] = useState(
    lead?.rsp || false
  );
  const [canCreateRSP, setCanCreateRsp] = useState(false);
  const [canViewRsp, setCanViewRsp] = useState(false);
  const [canEditRsp, setCanEditRsp] = useState(false);
  const [canDeleteRsp, setCanDeleteRsp] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const isEditMode = Boolean(lead?.id);


  const user = useUserStore((state) => state.user);
  const userrole = useRoleStore((state) => state.role);
  const userId = user?.id;

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: isOpen,
  });
  const { data: assignableUsers = [] } = useQuery<User[]>({
    queryKey: ["assignable-users", userId],
    enabled: isOpen && !!userId && !!userrole?.name,
    queryFn: async () => {
      const res = await fetch(
        `/api/assignable-users/${userId}?role=${userrole?.name}`
      );
      if (!res.ok) throw new Error("Failed to fetch assignable users");
      return res.json();
    },
  });
  const userType = user?.userType;
  const { data } = useQuery<{
    result: Customer[];
    totalcount: number;
  }>({
    queryKey: ["/api/customers/user", userId, userrole],
    queryFn: async () => {
      const res = await fetch(`/api/customers/user/${userId}?role=${userType}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    enabled: isOpen && !!userType,
  });

  const customers = data?.result || [];
  const total = data?.totalcount || 0;

  // const { data: customers } = useQuery<Customer[]>({
  //   queryKey: ["/api/customers"],
  //   enabled: isOpen,
  // });
  // const { data: rawCustomers } = useQuery<{
  //   result: Customer[];
  //   totalcount: number;
  // }>({
  //   queryKey: ["/api/customers"],
  //   enabled: isOpen,
  // });
  // const customers = rawCustomers?.result || [];

  const { data: contactsResponse } = useQuery<{ success: Boolean, contacts: Contact[], message: string }>({
    queryKey: ["/api/contacts-by-company", selectedCustomerId],
    enabled: isOpen && !!selectedCustomerId,
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const res = await apiRequest(
        "GET",
        `/api/contacts-by-company?companyId=${selectedCustomerId}`
      );
      return await res.json();
    },
  });
  const filteredContacts = contactsResponse?.contacts ? contactsResponse.contacts : [];

  // Filter contacts to only show contacts from the selected customer
  // const filteredContacts = contacts.filter(
  //   (contact) => contact.companyId === selectedCustomerId
  // );

  useEffect(() => {
    if (
      userrole?.permissions?.includes("all") ||
      userrole?.permissions?.includes("assign_leads")
    ) {
      setIsAssignLeadAllowed(true);
    } else {
      setIsAssignLeadAllowed(false);
    }
    if (
      userrole?.permissions?.includes("all") ||
      userrole?.permissions?.includes("create_rsp")
    ) {
      setCanCreateRsp(true);
    } else {
      setCanCreateRsp(false);
    }
    if (
      userrole?.permissions?.includes("all") ||
      userrole?.permissions?.includes("view_rsp")
    ) {
      setCanViewRsp(true);
    } else {
      setCanViewRsp(false);
    }
    if (
      userrole?.permissions?.includes("all") ||
      userrole?.permissions?.includes("delete_rsp")
    ) {
      setCanDeleteRsp(true);
    } else {
      setCanDeleteRsp(false);
    }
    if (
      userrole?.permissions?.includes("all") ||
      userrole?.permissions?.includes("edit_rsp")
    ) {
      setCanEditRsp(true);
    } else {
      setCanEditRsp(false);
    }
  }, [userrole]);
  useEffect(() => {
    if (lead?.rsp) {
      setIsFileUploadEnabled(!!lead.rsp);
    } else {
      setIsFileUploadEnabled(false);
    }
  }, [lead]);

  const hasRspPermission = (user: User) => {
    const rspPermissions = [
      "all",
      "create_rsp",
      "view_rsp",
      "edit_rsp",
      "delete_rsp",
    ];

    const role = roles.find((r) => r.id === user.roleId);
    if (!role) return false;

    return role.permissions?.some((p) => rspPermissions.includes(p));
  };

  const form = useForm({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      customerId: lead?.customerId || undefined,
      contactId: lead?.contactId || undefined,
      source: lead?.source || "",
      status: lead?.status || "new",
      value: lead?.value
        ? typeof lead.value === "number"
          ? String(lead.value)
          : lead.value
        : "",
      probability: typeof lead?.probability === "number" ? lead.probability : 0,
      assignedUserId: lead?.assignedUserId || null,
      notes: lead?.notes || "",
      tags: lead?.tags || [],
      companyName: lead?.companyName || "",
      pointOfContactFirstName: lead?.pointOfContactFirstName || "",
      pointOfContactLastName: lead?.pointOfContactLastName || "",
      websiteUrl: lead?.websiteUrl || "",
      countryRegion: lead?.countryRegion || "",
      timeZone: lead?.timeZone || "",
      createdByUserId: lead?.createdByUserId || userId || undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const customerId = lead?.customerId;
      const contactId = lead?.contactId;

      setIsExistingCustomer(!!customerId);
      setIsExistingContact(!!contactId);
      setSelectedCustomerId(customerId || undefined);
      setSelectedContactId(contactId || undefined);

      form.reset({
        name: lead?.name || "",
        email: lead?.email || "",
        phone: lead?.phone || "",
        customerId: customerId || undefined,
        contactId: contactId || undefined,
        source: lead?.source || "",
        status: lead?.status || "new",
        value: lead?.value
          ? typeof lead.value === "number"
            ? String(lead.value)
            : lead.value
          : "",
        probability:
          typeof lead?.probability === "number" ? lead.probability : 0,
        assignedUserId: lead?.assignedUserId || null,
        notes: lead?.notes || "",
        tags: lead?.tags || [],
        companyName: lead?.companyName || "",
        pointOfContactFirstName: lead?.pointOfContactFirstName || "",
        pointOfContactLastName: lead?.pointOfContactLastName || "",
        websiteUrl: lead?.websiteUrl || "",
        countryRegion: lead?.countryRegion || "",
        timeZone: lead?.timeZone || "",
        createdByUserId: lead?.createdByUserId || userId || undefined,
      });
      setTags(lead?.tags || []);
    }
  }, [lead, isOpen]);

  useEffect(() => {
    if (!isExistingCustomer) {
      form.setValue("customerId", undefined);
      form.setValue("contactId", undefined);
      setIsExistingContact(false);
      setSelectedCustomerId(undefined);
      setSelectedContactId(undefined);
    } else if (isExistingCustomer && !selectedCustomerId) {
      form.setValue("companyName", "");
      form.setValue("websiteUrl", "");
      form.setValue("countryRegion", "");
      form.setValue("timeZone", "");

    }
  }, [isExistingCustomer]);

  useEffect(() => {
    if (!isExistingContact) {
      form.setValue("contactId", undefined);
      setSelectedContactId(undefined);
    } else if (isExistingContact && !selectedContactId) {
      form.setValue("pointOfContactFirstName", "");
      form.setValue("pointOfContactLastName", "");
      form.setValue('email', "");
      form.setValue("phone", "");
    }
  }, [isExistingContact, selectedContactId, form]);

  const handleCustomerSelect = (customerId: number | undefined) => {
    setSelectedCustomerId(customerId);
    form.setValue("customerId", customerId);
    // Clear contact selection when customer changes
    form.setValue("contactId", undefined);
    setIsExistingContact(false);

    setSelectedContactId(undefined);

    if (customerId) {
      const customer = customers?.find((c) => c.id === customerId);
      if (customer) {
        form.setValue("companyName", customer.companyName || "");
        form.setValue("websiteUrl", customer.website || "");
        form.setValue("countryRegion", customer.country || "");
        form.setValue("timeZone", customer.timeZone || "");
      }
    }
  };

  const handleContactSelect = (contactId: number | undefined) => {
    form.setValue("contactId", contactId);
    if (contactId) {
      const contact = filteredContacts.find((c) => c.id === contactId);
      if (contact) {
        setSelectedContactId(contact.id);
        form.setValue("pointOfContactFirstName", contact.firstName || "");
        form.setValue("pointOfContactLastName", contact.lastName || "");
        form.setValue("email", contact.email || "");
        form.setValue("phone", contact.phone || "");
      }
    }
  };

  async function validateData(data: LeadFormData) {
    let isValid = true;
    console.log('data.email', data.email, ' isExistingCustomer', isExistingCustomer, ' !isExistingContact', isExistingContact)

    form.clearErrors();

    if (!data.name.trim()) {
      form.setError("name", { message: "Name is required." });
      isValid = false;
    } else {
      try {
        const leadName = data.name;
        let exists;
        if (lead && lead.id) {
          const leadId = lead.id;
          exists = await validateUniqueness.mutateAsync({ leadName, leadId });
        } else {
          exists = await validateUniqueness.mutateAsync({ leadName });
        }
        if (exists) {
          isValid = false;
          form.setError("name", {
            message: "This lead name is already taken."
          });
        }
      } catch (error) {
        console.error("Error validating lead name:", error);
      }
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      form.setError("email", { message: "Invalid email address." });
      isValid = false;
    } else if (data.email && isExistingCustomer && selectedCustomerId && !isExistingContact) {
      try {
        const email = data.email;
        const companyId = selectedCustomerId;
        console.log('**********company id is ', companyId);
        const exists = await validateUniqueness.mutateAsync({ email, companyId });
        console.log('**********email uniqueness is  ', companyId);
        if (exists) {
          isValid = false;
          form.setError("email", {
            message: "A contact with this email already exists in the same company."
          });
        }
      } catch (error) {
        console.error("Error validating email:", error);
      }
    }
    if (data.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(data.phone)) {
      form.setError("phone", { message: "Invalid phone number." });
      isValid = false;
    } else if (data.phone && isExistingCustomer && selectedCustomerId && !isExistingContact) {
      try {
        const phone = data.phone;
        const companyId = selectedCustomerId;
        const exists = await validateUniqueness.mutateAsync({ phone, companyId });
        if (exists) {
          isValid = false;
          form.setError("phone", {
            message: "A contact with this phone already exists in the same company."
          });
        }
      } catch (error) {
        console.error("Error validating phone:", error);
      }
    }
    if (data.value && (isNaN(Number(data.value)) || Number(data.value) < 0)) {
      form.setError("value", {
        message: "Value must be a non-negative number.",
      });
      isValid = false;
    }
    if (
      data.probability !== undefined &&
      (isNaN(Number(data.probability)) ||
        Number(data.probability) < 0 ||
        Number(data.probability) > 100)
    ) {
      form.setError("probability", {
        message: "Probability must be between 0 and 100.",
      });
      isValid = false;
    }

    if (!data.companyName.trim()) {
      form.setError("companyName", { message: "Company name is required." });
      isValid = false;
    } else if (!isExistingCustomer) {
      try {
        const companyName = data.companyName;
        const exists = await validateUniqueness.mutateAsync({ companyName });
        if (exists) {
          isValid = false;
          form.setError("companyName", {
            message: "This company name is already taken."
          });
        }
      } catch (error) {
        console.error("Error validating company name:", error);
      }
    }
    if (!data.pointOfContactFirstName.trim()) {
      form.setError("pointOfContactFirstName", {
        message: "First name is required.",
      });
      isValid = false;
    }
    if (
      data.websiteUrl &&
      !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(
        data.websiteUrl
      )
    ) {
      form.setError("websiteUrl", { message: "Invalid website URL." });
      isValid = false;
    }

    return isValid;
  }
  const createMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const formData = new FormData();

      // Append fields individually
      Object.entries({ ...data, tags }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      });
      // Append RSP flag (true if any files uploaded)
      formData.append("rsp", isFileUploadEnabled ? "true" : "false");

      // Append files
      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/leads", {
        method: "POST",
        body: formData,
      });
      return res.json();
    },
    onSuccess: () => {
      setUploadedFiles([]);
      setIsFileUploadEnabled(false);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Lead created",
        description: "The lead has been successfully created.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create lead.",
        variant: "destructive",
      });
    },
  });
  const updateMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const formData = new FormData();

      // Append all fields
      Object.entries({ ...data, tags }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value)
          );
        }
      });

      // // Append RSP flag (true if any new files OR existing rsp is true)
      formData.append(
        "rsp",
        isFileUploadEnabled || lead?.rsp ? "true" : "false"
      );

      // Append any new files
      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/leads/${lead!.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update lead");
      return res.json();
    },
    onSuccess: () => {
      setUploadedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Lead updated",
        description: "The lead has been successfully updated.",
      });
      onClose();
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: `Failed to update lead. ${err.message}`,
        variant: "destructive",
      });
    },
  });
  const validateCompanyName = useMutation<boolean, Error, { companyName: string }>({
    mutationFn: async (data: { companyName: string }) => {
      const response = await fetch(`/api/existing-company?companyName=${data.companyName}`);
      if (!response.ok) {
        throw new Error('Failed to check company name');
      }
      const result = await response.json();
      return result.exists;
    },
    onError: (error) => {
      console.error('Error validating company name:', error);
    },
  });
  const validateUniqueness = useMutation<boolean, Error, { companyName?: string; leadName?: string; phone?: string; email?: string; companyId?: number, leadId?: number }>({
    mutationFn: async (data: { companyName?: string; leadName?: string; phone?: string; email?: string; companyId?: number, leadId?: number }) => {
      let response;
      let result;
      if (data.companyName) {
        response = await fetch(`/api/existing-company?companyName=${data.companyName}`);
        if (!response.ok) {
          throw new Error('Failed to check company name');
        }
        result = await response.json();
        return result.exists;
      } else if (data.leadName && data.leadId) {
        response = await fetch(`/api/existing-lead-name?leadName=${data.leadName}&leadId=${data.leadId}`);
        if (!response.ok) {
          throw new Error('Failed to check lead name');
        }
        result = await response.json();
        return result.exists;
      } else if (data.leadName && !data.leadId) {
        response = await fetch(`/api/existing-lead-name?leadName=${data.leadName}`);
        if (!response.ok) {
          throw new Error('Failed to check lead name');
        }
        result = await response.json();
        return result.exists;
      } else if (data.phone && data.companyId) {
        response = await fetch(`/api/unique-lead-contact?phone=${data.phone}&companyId=${data.companyId}`);
        if (!response.ok) {
          throw new Error('Failed to check contact uniqueness');
        }
        result = await response.json();
        console.log('&&&&&&&&&&&&&&&...the result for phone is ', result, 'phone is ', data.phone, 'company id is', data.companyId);
        return result.phone;
      } else if (data.email && data.companyId) {
        response = await fetch(`/api/unique-lead-contact?email=${data.email}&companyId=${data.companyId}`);
        if (!response.ok) {
          throw new Error('Failed to check contact uniqueness');
        }
        result = await response.json();
        console.log('&&&&&&&&&&&&&&&...the result for phone is ', result, 'phone is ', data.phone, 'company id is', data.companyId);
        return result.email;
      }
      throw new Error('No valid data provided for validation');
    },
    onError: (error) => {
      console.error('Error validating data:', error);
    },
  });

  const sanitizeData = (data: LeadFormData): LeadFormData => {
    // const parsedProb = parseFloat(String(data.probability));
    const sanitized = {
      ...data,
      phone: data.phone?.trim() || undefined,
      customerId: data.customerId ? Number(data.customerId) : undefined,
      contactId: data.contactId ? Number(data.contactId) : undefined,
      source: data.source?.trim() || undefined,
      status: data.status?.trim() || "new",
      value: data.value ? data.value.toString() : undefined,
      probability:
        data.probability !== undefined &&
          data.probability !== null &&
          !isNaN(Number(data.probability))
          ? Number(data.probability)
          : null,
      // probability: data?.probability || 0,
      assignedUserId: data.assignedUserId ? Number(data.assignedUserId) : null,
      notes: data.notes?.trim() || undefined,
      tags: tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      companyName: data.companyName.trim(),
      pointOfContactFirstName: data.pointOfContactFirstName.trim(),
      pointOfContactLastName: data.pointOfContactLastName?.trim() || "",
      websiteUrl: data.websiteUrl?.trim() || undefined,
      countryRegion: data.countryRegion?.trim() || undefined,
      timeZone: data.timeZone?.trim() || undefined,
    };

    return sanitized;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !tags.includes(value)) {
        setTags([...tags, value]);
        setInputValue("");
      }
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (data: LeadFormData) => {
    console.log('................validating data ')
    const isValid = await validateData(data);
    console.log('...................validated data ', isValid)
    if (!isValid) {
      return;
    }

    const sanitized = sanitizeData(data);
    if (isEditing) {
      await updateMutation.mutateAsync(sanitized);
    } else {
      await createMutation.mutateAsync(sanitized);
    }
  };
  const handleCompanyNameBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
    const companyName = event.target.value;
    if (companyName) {
      try {
        const exists = await validateCompanyName.mutateAsync({ companyName });

        if (exists) {
          form.setError("companyName", {
            message: "This company name is already taken."
          });
        } else {
          form.clearErrors("companyName");
        }
      } catch (error) {
        console.error("Error validating company name:", error);
      }
    }
  };


  useEffect(() => {
    fetch("/timeZones.json")
      .then((res) => res.json())
      .then((data) => setTimeZones(data))
      .catch((err) => console.error("Failed to load time zones", err));
  }, []);

  // Common lead sources
  const leadSources = [
    "website",
    "referral",
    "social_media",
    "email_campaign",
    "cold_call",
    "trade_show",
    "other",
  ];

  const leadStatuses = ["new", "contacted", "lost"];

  // console.log("Form Data : ", form.watch());
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update lead information below."
              : "Add a new lead to your CRM system."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 pl-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="existing-customer" className="font-medium">
                  Is this lead from an existing customer?
                </Label>
                <Switch
                  id="existing-customer"
                  checked={isExistingCustomer}
                  onCheckedChange={setIsExistingCustomer}
                />
              </div>

              {isExistingCustomer && (
                <div className="space-y-2">
                  <Label>Select Customer *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedCustomerId
                          ? customers?.find(
                            (customer) => customer.id === selectedCustomerId
                          )?.companyName || "Select customer"
                          : "Select customer"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {customers?.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.companyName}
                              onSelect={() => {
                                handleCustomerSelect(customer.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customer.id === selectedCustomerId
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {customer.companyName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {isExistingCustomer && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="existing-contact" className="font-medium">
                    Is this an existing contact?
                  </Label>
                  <Switch
                    id="existing-contact"
                    checked={isExistingContact}
                    onCheckedChange={setIsExistingContact}
                    disabled={!isExistingCustomer}
                  />
                </div>

                {isExistingContact && (
                  <div className="space-y-2">
                    <Label>Select Contact</Label>
                    {filteredContacts.length === 0 ? (
                      <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
                        No contacts found for the selected customer. Please add
                        contacts to this customer first.
                      </div>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            disabled={
                              !selectedCustomerId ||
                              filteredContacts.length === 0
                            }
                          >
                            {form.watch("contactId")
                              ? filteredContacts.find(
                                (contact) =>
                                  contact.id === form.watch("contactId")
                              )?.firstName +
                              " " +
                              (filteredContacts.find(
                                (contact) =>
                                  contact.id === form.watch("contactId")
                              )?.lastName || "") || "Select contact"
                              : filteredContacts.length > 0
                                ? "Select contact"
                                : "No contacts available"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search contacts..." />
                            <CommandEmpty>No contact found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {filteredContacts.map((contact) => (
                                <CommandItem
                                  key={contact.id}
                                  value={`${contact.firstName} ${contact.lastName}`}
                                  onSelect={() => {
                                    handleContactSelect(contact.id);
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
                                  {contact.firstName} {contact.lastName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}
              </div>
            )}
            {canCreateRSP && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="enableFileUpload"
                    className={
                      isEditMode && lead?.rsp ? "text-gray-400" : "font-medium"
                    }
                  >
                    Add RFP
                  </Label>
                  <Switch
                    id="enableFileUpload"
                    checked={isFileUploadEnabled}
                    disabled={isEditMode && lead?.rsp}
                    onCheckedChange={setIsFileUploadEnabled}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    {...form.register("companyName")}
                    disabled={isExistingCustomer}
                    onBlur={handleCompanyNameBlur}
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.companyName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    placeholder="https://example.com"
                    {...form.register("websiteUrl")}
                    disabled={isExistingCustomer}
                  />
                  {form.formState.errors.websiteUrl && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.websiteUrl.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryRegion">Country/Region</Label>
                  <Input
                    id="countryRegion"
                    placeholder="Enter country or region"
                    {...form.register("countryRegion")}
                    disabled={isExistingCustomer}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Select
                    onValueChange={(value) => form.setValue("timeZone", value)}
                    defaultValue={form.watch("timeZone") || ""}
                    disabled={isExistingCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZones.map((tz) => (
                        <SelectItem
                          key={tz.value}
                          value={tz.utc[0] ?? tz.value}
                        >
                          {tz.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Contact Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pointOfContactFirstName">First Name *</Label>
                  <Input
                    id="pointOfContactFirstName"
                    placeholder="Enter first name"
                    {...form.register("pointOfContactFirstName")}
                    disabled={isExistingContact}
                  />
                  {form.formState.errors.pointOfContactFirstName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.pointOfContactFirstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointOfContactLastName">Last Name</Label>
                  <Input
                    id="pointOfContactLastName"
                    placeholder="Enter last name"
                    {...form.register("pointOfContactLastName")}
                    disabled={isExistingContact}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    {...form.register("email")}
                    disabled={isExistingContact}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    {...form.register("phone")}
                    disabled={isExistingContact}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Lead Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter lead name"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%) (0-100)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    {...form.register("probability", {
                      valueAsNumber: true,
                    })}
                  />
                  {form.formState.errors.probability && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.probability.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Lead Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select
                    onValueChange={(value) => form.setValue("source", value)}
                    defaultValue={form.watch("source") || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    onValueChange={(value) => form.setValue("status", value)}
                    defaultValue={form.watch("status") || "new"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isAssignLeadAllowed && (
                  <div className="space-y-2">
                    <Label htmlFor="assignedUserId">Assigned To</Label>
                    <Select
                      onValueChange={(value) => {
                        if (value === "none") {
                          form.setValue("assignedUserId", null); // ⬅️ handle Unassigned
                        } else {
                          form.setValue("assignedUserId", parseInt(value));
                        }
                      }}
                      defaultValue={
                        lead?.assignedUserId
                          ? lead.assignedUserId.toString()
                          : "none"
                      }
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
                          .filter((user) => user.isActive)
                          .filter((user) =>
                            isFileUploadEnabled
                              ? hasRspPermission(user)
                              : user
                          )
                          .map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("value")}
                  />
                  {form.formState.errors.value && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.value.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {(isFileUploadEnabled ||
              (isEditMode && !!lead?.rsp && canViewRsp)) && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="leadFile">Upload File</Label>

                    {/* File input: always enabled */}
                    <Input
                      id="leadFile"
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

                    {/* Newly selected files (client-side before upload) */}
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
                              <X />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Existing files from DB (show in edit mode when rsp is true) */}
                    {isEditMode &&
                      !!lead?.rsp &&
                      Array.isArray(lead.rspFiles) &&
                      lead.rspFiles.length > 0 && (
                        <ul className="text-sm text-gray-600 list-disc pl-5">
                          {lead.rspFiles.map((path: string, idx: number) => {
                            const lastSegment = path.split("/").pop() ?? path;
                            const filename = lastSegment.includes("-")
                              ? lastSegment.split("-").slice(1).join("-")
                              : lastSegment;

                            const publicUrl = `https://storage.googleapis.com/crm_rsp/${path}`;

                            return (
                              <li key={idx}>
                                <a
                                  href={publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline text-sm"
                                >
                                  {filename}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                  </div>
                </div>
              )}

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Tags</h3>
              <div className="space-y-2">
                <Label htmlFor="tags">Add Tags</Label>

                <div
                  className={cn(
                    // Outer container handles the border and focus
                    "flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors",
                    "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
                  )}
                >
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  <input
                    id="tags"
                    placeholder="Add tags (press comma or enter)"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Notes</h3>
              <div className="space-y-2 relative">
                <Label htmlFor="notes">Additional Information</Label>
                <div className="relative">
                  <Textarea
                    id="notes"
                    placeholder="Enter any additional notes"
                    maxLength={500} // prevents typing beyond 500 characters
                    {...form.register("notes", {
                      maxLength: {
                        value: 500,
                        message: "Notes cannot exceed 500 characters",
                      },
                    })}
                    className="min-h-[100px] pr-14"
                  />
                  {/* Live character counter */}
                  <span
                    className={`absolute bottom-2 right-3 text-xs ${(form.watch("notes")?.length || 0) >= 500
                      ? "text-red-600"
                      : "text-gray-500"
                      }`}
                  >
                    {form.watch("notes")?.length || 0}/500
                  </span>
                </div>
                {form.formState.errors.notes && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.notes.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-background pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || lead?.status === "qualified"}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                    ? "Update Lead"
                    : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
