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
import { Switch } from "@/components/ui/switch";
import { Search, UserIcon, Building, User as UserIcon2 } from "lucide-react";
import { insertContactSchema, Contact, Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore } from "@/stores/useRoleStore";
import { FALLBACK_URL } from "@/constants/data";

type ContactFormData = z.infer<typeof insertContactSchema>;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact | null;
}

export function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState("");
  const isEditing = !!contact;
  const userId = useUserStore((state) => state.user?.id);

  // const { data: customers } = useQuery<{ result: Customer[]; totalcount: number }>({
  //   queryKey: ["/api/customers"],
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

  const Customers = taskDataa?.result?.customers || [];

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const fallbackUrl = FALLBACK_URL;
  const [profilePicUrl, setProfilePicUrl] = useState<any>(fallbackUrl);

  const filteredCustomers = Customers;

  //   const filteredCustomers = updatedcustomers.filter(customer =>
  //   (customer.companyName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
  //    customer.contactName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
  //    customer.email?.toLowerCase().includes(customerSearch.toLowerCase())) ||
  //   customerSearch === ""
  // );

  const form = useForm<ContactFormData>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      assignedUserId: undefined,
      companyId: undefined,
      companyWebsite: "",
      contactUnworked: false,
      countryRegion: "",
      email: "",
      employmentRole: "",
      gender: "",
      industry: "",
      jobTitle: "",
      latestTrafficSource: "",
      linkedinProfile: "",
      linkedinUrl: "",
      listName: "",
      marketingContactStatus: "",
      numberOfSalesActivities: 0,
      numberOfTimesContacted: 0,
      phone: "",
      postalCode: "",
      timeZone: "",
      websiteUrl: "",
      isActive: true,
      createdByUserId: userId,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        firstName: contact?.firstName || "",
        lastName: contact?.lastName || "",
        assignedUserId: contact?.assignedUserId || undefined,
        companyId: contact?.companyId || undefined,
        companyWebsite: contact?.companyWebsite || "",
        contactUnworked: contact?.contactUnworked || false,
        countryRegion: contact?.countryRegion || "",
        email: contact?.email || "",
        employmentRole: contact?.employmentRole || "",
        gender: contact?.gender || "",
        industry: contact?.industry || "",
        jobTitle: contact?.jobTitle || "",
        latestTrafficSource: contact?.latestTrafficSource || "",
        linkedinProfile: contact?.linkedinProfile || "",
        linkedinUrl: contact?.linkedinUrl || "",
        listName: contact?.listName || "",
        marketingContactStatus: contact?.marketingContactStatus || "",
        numberOfSalesActivities: contact?.numberOfSalesActivities || 0,
        numberOfTimesContacted: contact?.numberOfTimesContacted || 0,
        phone: contact?.phone || "",
        postalCode: contact?.postalCode || "",
        timeZone: contact?.timeZone || "",
        websiteUrl: contact?.websiteUrl || "",
        isActive: contact?.isActive ?? true,
      });

      setProfilePicUrl(contact?.avatar || fallbackUrl);
      setProfilePicture(null);
    }
  }, [contact, isOpen, form]);

  function validateData(data: ContactFormData) {
    let isValid = true;
    if (!(data.firstName ?? "").trim()) {
      form.setError("firstName", { message: "First Name is required." });
      isValid = false;
    }
    if (!(data.lastName ?? "").trim()) {
      form.setError("lastName", { message: "Last Name is required." });
      isValid = false;
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      form.setError("email", { message: "Invalid email address." });
      isValid = false;
    }
    if (data.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(data.phone)) {
      form.setError("phone", { message: "Invalid phone number." });
      isValid = false;
    }
    return isValid;
  }

  const formatCustomerName = (customer: Customer) => {
    const company = customer.companyName || "-";
    return `${company}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const extendedData = {
        ...data,
        avatar: fallbackUrl,
      };

      // Create the contact first
      const res = await apiRequest("POST", "/api/contacts", extendedData);
      if (!res.ok) throw new Error("Failed to create customer");
      const createdContact = await res.json();

      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);

        const updatedContact = await fetch(
          `/api/contacts/${createdContact.id}/avatar`,
          {
            method: "PUT",
            body: formData,
          }
        );
        if (!updatedContact.ok) {
          throw new Error("contact created but avatar upload failed");
        }
        const updatedCustomer = await updatedContact.json();
        return updatedCustomer;
      }
      return createdContact;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/user"] });
      toast({
        title: "Contact created",
        description: "The contact has been successfully created.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contact.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const res = await apiRequest("PUT", `/api/contacts/${contact!.id}`, data);
      if (!res.ok) {
        throw new Error("Error updating contact");
      }
      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);

        const updatedContact = await fetch(
          `/api/contacts/${contact?.id}/avatar`,
          {
            method: "PUT",
            body: formData,
          }
        );
        if (!updatedContact.ok) {
          throw new Error("contact updated but avatar updation failed");
        }
        const updatedCustomer = await updatedContact.json();
        return updatedCustomer;
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/user"] });
      toast({
        title: "Contact updated",
        description: "The contact has been successfully updated.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact.",
        variant: "destructive",
      });
    },
  });

  const [uniqueData, setUniqueData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // --- onBlur handler ---
  const handleBlur = async (field: "email" | "phone") => {
    const value = form.getValues(field);
    if (!value) return; // skip if empty

    try {
      const contactId = contact?.id ? contact.id.toString() : "new";

      const params = new URLSearchParams({
        email: field === "email" ? value : "",
        phone: field === "phone" ? value : "",
        id: contactId,
      });

      const res = await fetch(`/api/unique-contact?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to check uniqueness");

      const uniqueness = await res.json(); // e.g. { success: true, email: true, phone: false }
      setUniqueData(uniqueness);

      // If already exists → show error on field
      if (uniqueness[field]) {
        form.setError(field, {
          type: "manual",
          message: `${
            field === "email" ? "Email" : "Phone number"
          } already exists.`,
        });
      } else {
        // Clear error if it’s now valid
        form.clearErrors(field);
      }
    } catch (err) {
      console.error("Error checking uniqueness:", err);
    }
  };

  // --- onSubmit handler ---
  const handleSubmit = async (formData: ContactFormData) => {
    try {
      const { email, phone } = form.getValues();

      if (!email && !phone) return;

      setLoading(true);
      const contactId = contact?.id ? contact.id.toString() : "new";

      // Recheck uniqueness before final submit
      const params = new URLSearchParams({
        email: email || "",
        phone: phone || "",
        id: contactId,
      });

      const res = await fetch(`/api/unique-contact?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to check uniqueness");

      const uniqueness = await res.json();
      setUniqueData(uniqueness);

      if (!uniqueness.success) {
        console.error("Uniqueness check failed");
        return;
      }

      // Stop submission if duplicates found
      if (uniqueness.email) {
        form.setError("email", {
          type: "manual",
          message: "Email already exists.",
        });
        return;
      }
      if (uniqueness.phone) {
        form.setError("phone", {
          type: "manual",
          message: "Phone number already exists.",
        });
        return;
      }

      // Proceed if valid
      if (isEditing) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (err) {
      console.error("Error during submission:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] pl-[5px] pr-[5px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update contact information below."
              : "Add a new contact to your database."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-5 pl-2">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2 flex justify-center">
              <div>
                {/* Profile Preview with Edit Button */}
                <div className="relative group">
                  <img
                    src={
                      profilePicture
                        ? URL.createObjectURL(profilePicture)
                        : profilePicUrl
                    }
                    alt="Team Profile"
                    className="w-20 h-20 rounded-full object-cover shadow-sm border"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("profilePicInput")?.click()
                    }
                    className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white"
                    aria-label="Edit profile picture"
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Hidden inputs */}
              <input
                id="profilePicInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setProfilePicture(e.target.files[0]);
                  }
                }}
              />
              <input
                id="cameraInputProfile"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setProfilePicture(e.target.files[0]);
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  {...form.register("firstName", {
                    required: "First name is required",
                  })}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Enter last name"
                  {...form.register("lastName", {
                    required: "Last name is required",
                  })}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  {...form.register("email")}
                  onBlur={() => handleBlur("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
                {uniqueData?.email && !form.formState.errors.email && (
                  <p className="text-sm text-red-600">Email already exists</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  {...form.register("phone")}
                  onBlur={() => handleBlur("phone")}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.phone.message}
                  </p>
                )}
                {uniqueData?.phone && !form.formState.errors.phone && (
                  <p className="text-sm text-red-600">
                    Phone number already exists
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="Enter job title"
                  {...form.register("jobTitle")}
                />
                {form.formState.errors.jobTitle && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.jobTitle.message}
                  </p>
                )}
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="employmentRole">Employment Role</Label>
                <Input
                  id="employmentRole"
                  placeholder="Enter employment role"
                  {...form.register("employmentRole")}
                />
                {form.formState.errors.employmentRole && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.employmentRole.message}
                  </p>
                )}
              </div> */}
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <Input
                  id="companyWebsite"
                  placeholder="Enter company website"
                  {...form.register("companyWebsite")}
                />
                {form.formState.errors.companyWebsite && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.companyWebsite.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              {/* <div className="space-y-2">
                <Label htmlFor="websiteUrl">Personal Website</Label>
                <Input
                  id="websiteUrl"
                  placeholder="Enter personal website"
                  {...form.register("websiteUrl")}
                />
                {form.formState.errors.websiteUrl && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.websiteUrl.message}
                  </p>
                )}
              </div> */}
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  placeholder="https://www.linkedin.com/in/your-linkedin-profile/"
                  {...form.register("linkedinUrl")}
                />
                {form.formState.errors.linkedinUrl && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.linkedinUrl.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinProfile">LinkedIn Profile</Label>
                <Input
                  id="linkedinProfile"
                  placeholder="Enter LinkedIn profile name"
                  {...form.register("linkedinProfile")}
                />
                {form.formState.errors.linkedinProfile && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.linkedinProfile.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="countryRegion">Country/Region</Label>
                <Input
                  id="countryRegion"
                  placeholder="Enter country/region"
                  {...form.register("countryRegion")}
                />
                {form.formState.errors.countryRegion && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.countryRegion.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="Enter postal code"
                  {...form.register("postalCode")}
                />
                {form.formState.errors.postalCode && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.postalCode.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Input
                  id="timeZone"
                  placeholder="Enter time zone"
                  {...form.register("timeZone")}
                />
                {form.formState.errors.timeZone && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.timeZone.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  placeholder="Enter gender"
                  {...form.register("gender")}
                />
                {form.formState.errors.gender && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.gender.message}
                  </p>
                )}
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="Enter industry"
                  {...form.register("industry")}
                />
                {form.formState.errors.industry && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.industry.message}
                  </p>
                )}
              </div> */}
            </div>

            <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              {/* <div className="space-y-2">
                <Label htmlFor="listName">List Name</Label>
                <Input
                  id="listName"
                  placeholder="Enter list name"
                  {...form.register("listName")}
                />
                {form.formState.errors.listName && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.listName.message}
                  </p>
                )}
              </div> */}
            </div>

            {/* <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="marketingContactStatus">Marketing Status</Label>
                <Input
                  id="marketingContactStatus"
                  placeholder="Enter marketing status"
                  {...form.register("marketingContactStatus")}
                />
                {form.formState.errors.marketingContactStatus && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.marketingContactStatus.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="latestTrafficSource">
                  Latest Traffic Source
                </Label>
                <Input
                  id="latestTrafficSource"
                  placeholder="Enter traffic source"
                  {...form.register("latestTrafficSource")}
                />
                {form.formState.errors.latestTrafficSource && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.latestTrafficSource.message}
                  </p>
                )}
              </div>
            </div> */}

            {/* <div className="grid grid-cols-2 gap-4 pl-[5px] pr-[5px]">
              <div className="space-y-2">
                <Label htmlFor="numberOfSalesActivities">
                  Sales Activities
                </Label>
                <Input
                  id="numberOfSalesActivities"
                  type="number"
                  placeholder="Number of sales activities"
                  {...form.register("numberOfSalesActivities", {
                    valueAsNumber: true,
                  })}
                />
                {form.formState.errors.numberOfSalesActivities && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.numberOfSalesActivities.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfTimesContacted">Times Contacted</Label>
                <Input
                  id="numberOfTimesContacted"
                  type="number"
                  placeholder="Number of times contacted"
                  {...form.register("numberOfTimesContacted", {
                    valueAsNumber: true,
                  })}
                />
                {form.formState.errors.numberOfTimesContacted && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.numberOfTimesContacted.message}
                  </p>
                )}
              </div>
            </div> */}

            <div className="space-y-2 pl-[5px] pr-[5px]">
              <Label htmlFor="customerId">Related Customer</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue(
                    "companyId",
                    value === "none" ? undefined : parseInt(value)
                  )
                }
                value={form.watch("companyId")?.toString() || "none"}
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

            {/* <div className="flex items-center space-x-2">
              <Switch
                id="contactUnworked"
                checked={!!form.watch("contactUnworked")}
                onCheckedChange={(checked) =>
                  form.setValue("contactUnworked", checked)
                }
              />
              <Label htmlFor="contactUnworked">Contact Unworked</Label>
            </div> */}

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={!!form.watch("isActive")}
                onCheckedChange={(checked) =>
                  form.setValue("isActive", checked)
                }
              />
              <Label htmlFor="isActive">Active Contact</Label>
            </div>

            <DialogFooter className="pt-4">
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
                  ? "Update Contact"
                  : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
