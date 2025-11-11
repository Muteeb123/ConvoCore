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
  insertCustomerSchema,
  Customer,
  Lead,
  Contact,
  Opportunity,
  Task,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { Trash2, X } from "lucide-react";
import { FALLBACK_URL } from "@/constants/data";

const customerFormSchema = insertCustomerSchema.extend({
  companyName: z.string().min(1, "Company name is required"),
  email: z
    .string()
    .email("Please enter a valid email")
    .or(z.literal(""))
    .optional(),
  phone: z
    .string()
    .regex(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
      "Please enter a valid phone number"
    )
    .or(z.literal(""))
    .optional(),
  website: z
    .string()
    .url("Please enter a valid URL (include http:// or https://)")
    .or(z.literal(""))
    .optional(),
  annualRevenue: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  city: z.string().optional(),
  country: z.string().optional(),
  // daysToClose: z.preprocess(
  //   (val) => (val === "" ? undefined : Number(val)),
  //   z.number().optional()
  // ),
  description: z.string().optional(),
  facebookPage: z.string().url().or(z.literal("")).optional(),
  industry: z.string().optional(),
  lifecycleStage: z.string().optional(),
  linkedInHandle: z.string().optional(),
  numOfContacts: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  numOfEmployees: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional()
  ),
  // numOfTimesContacted: z.preprocess(
  //   (val) => (val === "" ? undefined : Number(val)),
  //   z.number().optional()
  // ),
  originalSource: z.string().optional(),
  parentCompany: z.string().optional(),
  postalCode: z.string().optional(),
  state: z.string().optional(),
  street: z.string().optional(),
  timeZone: z.string().optional(),
  twitterHandle: z.string().optional(),
  webTechnologies: z.array(z.string()).optional(),
  yearFounded: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) {
      return undefined; // This is what .optional() expects
    }
    return Number(val);
  }, z.number().optional()),
  notes: z.string().optional(),
  createdByUserName: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

interface CustomerFormInputs {
  companyName: string;
  email: string;
  phone: string;
}

interface CustomerAssociations {
  leads: Lead[];
  contacts: Contact[];
  opportunities: Opportunity[];
  tasks: Task[];
}

export function CustomerModal({
  isOpen,
  onClose,
  customer,
}: CustomerModalProps) {
  const { toast } = useToast();
  const isEditing = !!customer;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const user = useUserStore((state) => state.user);
  const userId = user?.id;
  const usernam = user?.username;
  const userrole = useRoleStore((state) => state.role);
  const [newTech, setNewTech] = useState("");

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const fallbackUrl = FALLBACK_URL;
  const [profilePicUrl, setProfilePicUrl] = useState<any>(fallbackUrl);

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

  const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data } = useQuery<CustomerAssociations>({
    queryKey: ["/api/customers/associations", customer?.id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer?.id}/associations`);
      if (!res.ok) throw new Error("Failed to fetch associations");
      return res.json();
    },
    enabled: !!customer?.id,
  });

  const totalcontactsnumber = data?.contacts?.length || 0;
  // ✅ This is the correct code
  console.log("relatedContacts Length : ", data?.contacts);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      companyName: customer?.companyName || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      website: customer?.website || "",
      annualRevenue: customer?.annualRevenue || undefined,
      city: customer?.city || "",
      country: customer?.country || "",
      // daysToClose: customer?.daysToClose || undefined,
      description: customer?.description || "",
      facebookPage: customer?.facebookPage || "",
      industry: customer?.industry || "",
      lifecycleStage: customer?.lifecycleStage || "",
      linkedInHandle: customer?.linkedInHandle || "",
      numOfContacts: totalcontactsnumber || undefined,
      numOfEmployees: customer?.numOfEmployees || undefined,
      // numOfTimesContacted: customer?.numOfTimesContacted || undefined,
      originalSource: customer?.originalSource || "",
      parentCompany: customer?.parentCompany || "",
      postalCode: customer?.postalCode || "",
      state: customer?.state || "",
      street: customer?.street || "",
      timeZone: customer?.timeZone || detectedTimeZone,
      twitterHandle: customer?.twitterHandle || "",
      webTechnologies: customer?.webTechnologies
        ? customer.webTechnologies.split(",").filter(Boolean)
        : [],
      yearFounded: customer?.yearFounded || undefined,
      notes: customer?.notes || "",
      assignedUserId: customer?.assignedUserId || null,
      status: customer?.status || "active",
      createdByUserName: usernam,
      avatar: customer?.avatar || fallbackUrl,
    },
    shouldFocusError: false,
  });
  const [uniqueData, setUniqueData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        companyName: customer?.companyName || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
        website: customer?.website || "",
        annualRevenue: customer?.annualRevenue || undefined,
        city: customer?.city || "",
        country: customer?.country || "",
        // daysToClose: customer?.daysToClose || undefined,
        description: customer?.description || "",
        facebookPage: customer?.facebookPage || "",
        industry: customer?.industry || "",
        lifecycleStage: customer?.lifecycleStage || "",
        linkedInHandle: customer?.linkedInHandle || "",
        numOfContacts: totalcontactsnumber || undefined,
        numOfEmployees: customer?.numOfEmployees || undefined,
        // numOfTimesContacted: customer?.numOfTimesContacted || undefined,
        originalSource: customer?.originalSource || "",
        parentCompany: customer?.parentCompany || "",
        postalCode: customer?.postalCode || "",
        state: customer?.state || "",
        street: customer?.street || "",
        timeZone: customer?.timeZone || detectedTimeZone,
        twitterHandle: customer?.twitterHandle || "",
        webTechnologies: customer?.webTechnologies
          ? customer.webTechnologies.split(",").filter(Boolean)
          : [],
        yearFounded: customer?.yearFounded || undefined,
        notes: customer?.notes || "",
        assignedUserId: customer?.assignedUserId || null,
        status: customer?.status || "active",
        createdByUserName: usernam, // Now this will update correctly
      });
      setProfilePicture(null);
      setSelectedFiles([]);
      setProfilePicUrl(customer?.avatar || fallbackUrl);
    }
  }, [isOpen, customer, usernam, form.reset, totalcontactsnumber]); // <-- Add 'usernam' and 'form.reset'
  //create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // STEP 1️⃣ — Create the customer in DB (without files)
      const dataToSave = {
        ...data,
        webTechnologies: (data.webTechnologies || []).join(","),
      };

      const createResponse = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: JSON.stringify(dataToSave) }),
      });

      if (!createResponse.ok) throw new Error("Failed to create customer");
      const createdCustomer = await createResponse.json();

      // STEP 2️⃣ — Upload files if selected
      if (selectedFiles.length > 0 || profilePicture) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(createdCustomer));
        console.log("NO profile picture  ");
        if (profilePicture) {
          console.log("the profile picture is here ", profilePicture);

          formData.append("file", profilePicture);
        }

        selectedFiles.forEach((file) => formData.append("files", file));

        const uploadResponse = await fetch(
          `/api/customers-with-files/${createdCustomer.id}`,
          {
            method: "PUT",
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Customer created but file upload failed");
        }

        const updatedCustomer = await uploadResponse.json();
        return updatedCustomer;
      }

      // STEP 3️⃣ — Return customer if no files
      return createdCustomer;
    },

    onSuccess: () => {
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/customer-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Customer created",
        description: "The customer has been successfully created.",
      });
      onClose();
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer.",
        variant: "destructive",
      });
    },
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 125 }, (_, i) => currentYear - i);

  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // const res = await apiRequest("PUT", `/api/customers/${customer!.id}`, data);
      // return await res.json();
      const dataToSave = {
        ...data,
        webTechnologies: (data.webTechnologies || []).join(","),
      };
      const formData = new FormData();
      formData.append("data", JSON.stringify(dataToSave));
      selectedFiles.forEach((file) => formData.append("files", file));
      if (profilePicture) {
        formData.append("file", profilePicture);
      }

      const res = await fetch(`/api/customers-with-files/${customer!.id}`, {
        method: "PUT",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({
        title: "Customer updated",
        description: "The customer has been successfully updated.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer.",
        variant: "destructive",
      });
    },
  });
  const { data: customerFiles, isLoading } = useQuery({
    queryKey: ["/api/customer-files", customer?.id, userId],
    queryFn: async () => {
      const res = await fetch(`/api/customer-files?customerId=${customer?.id}`);
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!customer?.id,
  });

  const handleBlur = async () => {
    const { companyName, email, phone } = form.getValues();

    if (!companyName && !email && !phone) return;
    const customerId = customer?.id ? customer.id.toString() : "new";
    try {
      setLoading(true);
      const params = new URLSearchParams({
        companyName: companyName || "",
        email: email || "",
        phone: phone || "",
        id: customerId,
      });
      const res = await fetch(`/api/customers/checker?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to check uniqueness");
      const data = await res.json();
      setUniqueData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CustomerFormData) => {
    const { companyName, email, phone } = form.getValues();

    // Prevent empty submissions
    if (!companyName && !email && !phone) return;

    try {
      setLoading(true);
      const customerId = customer?.id ? customer.id.toString() : "new";
      // --- Step 1: Check uniqueness from backend ---
      const params = new URLSearchParams({
        companyName: companyName || "",
        email: email || "",
        phone: phone || "",
        id: customerId,
      });

      const res = await fetch(`/api/customers/checker?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to check uniqueness");

      const checkdata = await res.json();

      // --- Step 2: Stop if any field already exists ---
      const {
        companyName: cExists,
        email: eExists,
        phone: pExists,
      } = checkdata.exists;

      if (cExists || eExists || pExists) {
        const duplicateFields = [];
        if (cExists) duplicateFields.push("Company Name");
        if (eExists) duplicateFields.push("Email");
        if (pExists) duplicateFields.push("Phone");

        // Optionally show the message in the UI instead of console
        alert(
          `❌ Customer not created: duplicate found in ${duplicateFields.join(
            ", "
          )}`
        );
        return; // stop here — no creation happens
      }

      // Store unique check result if needed
      setUniqueData(checkdata);

      // --- Step 3: Prepare cleaned data ---
      const cleanedData = {
        ...data,
        avatar: fallbackUrl,
        email: data.email || undefined,
        phone: data.phone || undefined,
        website: data.website || undefined,
        facebookPage: data.facebookPage || undefined,
      };

      // --- Step 4: Proceed with create or update ---
      if (isEditing) {
        await updateMutation.mutateAsync(cleanedData);
      } else {
        await createMutation.mutateAsync(cleanedData);
      }
    } catch (err) {
      console.error("Error during submission:", err);
    } finally {
      setLoading(false);
    }
  };
  const onInvalid = (errors) => {
    console.error("Form Validation Errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check the form for errors. See console for details.",
      variant: "destructive",
    });
  };

  const industryOptions = [
    "Agriculture",
    "Automotive",
    "Banking",
    "Biotechnology",
    "Construction",
    "Education",
    "Energy",
    "Entertainment",
    "Finance",
    "Food & Beverage",
    "Healthcare",
    "Hospitality",
    "Information Technology",
    "Manufacturing",
    "Media",
    "Non-profit",
    "Real Estate",
    "Retail",
    "Telecommunications",
    "Transportation",
    "Other",
  ];

  const lifecycleStages = [
    "Lead",
    "Marketing Qualified Lead",
    "Sales Qualified Lead",
    "Opportunity",
    "Customer",
    "Evangelist",
    "Other",
  ];

  const timeZones = [
    "GMT",
    "EST",
    "PST",
    "CST",
    "MST",
    "IST",
    "CET",
    "AEST",
    "Other",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update customer information below."
              : "Add a new customer to your CRM system."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit, onInvalid)}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                {...form.register("companyName")}
                required={true}
                onBlur={handleBlur}
              />
              {form.formState.errors.companyName && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.companyName.message}
                </p>
              )}
              {uniqueData?.exists?.companyName && (
                <p className="text-sm text-red-600">
                  Company name already exists
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...form.register("email")}
                required={true}
                onBlur={handleBlur}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
              {uniqueData?.exists?.email && (
                <p className="text-sm text-red-600">Email already exists</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                {...form.register("phone")}
                required={true}
                onBlur={handleBlur}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.phone.message}
                </p>
              )}
              {uniqueData?.exists?.phone && (
                <p className="text-sm text-red-600">
                  Phone number already exists
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                {...form.register("website")}
              />
              {form.formState.errors.website && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annualRevenue">Annual Revenue ($)</Label>
              <Input
                id="annualRevenue"
                type="number"
                placeholder="Enter annual revenue"
                {...form.register("annualRevenue")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numOfEmployees">Number of Employees</Label>
              <Input
                id="numOfEmployees"
                type="number"
                placeholder="Enter number of employees"
                {...form.register("numOfEmployees")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearFounded">Year Founded</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue(
                    "yearFounded",
                    // 2. Check for the string "null" instead of ""
                    value === "null" ? undefined : Number(value)
                  )
                }
                // 3. Default to the string "null" if no year is set
                defaultValue={customer?.yearFounded?.toString() || "null"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {/* 1. Use the string "null" for the value */}
                  <SelectItem
                    value="null"
                    className="text-muted-foreground italic"
                  >
                    — No Year Selected —
                  </SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                onValueChange={(value) => form.setValue("industry", value)}
                defaultValue={customer?.industry || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* <div className="space-y-2">
              <Label htmlFor="lifecycleStage">Lifecycle Stage</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("lifecycleStage", value)
                }
                defaultValue={customer?.lifecycleStage || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {lifecycleStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="parentCompany">Parent Company</Label>
              <Input
                id="parentCompany"
                placeholder="Enter parent company"
                {...form.register("parentCompany")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value) => form.setValue("status", value)}
                defaultValue={customer?.status || "active"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  {/* <SelectItem value="prospect">Prospect</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* <div className="grid grid-cols-2 gap-4">
          

            <div className="space-y-2">
              <Label htmlFor="originalSource">Original Source</Label>
              <Input
                id="originalSource"
                placeholder="How did they find you?"
                {...form.register("originalSource")}
              />
            </div>
          </div> */}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numOfContacts">Number of Contacts</Label>
              <Input
                id="numOfContacts"
                type="number"
                placeholder="Enter number of contacts"
                {...form.register("numOfContacts")}
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="numOfTimesContacted">Times Contacted</Label>
              <Input
                id="numOfTimesContacted"
                type="number"
                placeholder="Enter number of contacts"
                {...form.register("numOfTimesContacted")}
              />
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="timeZone">Time Zone</Label>
              <Select
                // 👇 Use 'value' prop for a controlled component
                value={form.watch("timeZone") || ""}
                onValueChange={(value) => form.setValue("timeZone", value)}
                // 🚨 defaultValue prop is removed
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent>
                  {/* 👇 This logic adds your auto-detected time zone to the list */}
                  {detectedTimeZone &&
                    !timeZones.includes(detectedTimeZone) && (
                      <SelectItem value={detectedTimeZone}>
                        {detectedTimeZone}
                      </SelectItem>
                    )}

                  {/* This renders your original list */}
                  {timeZones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daysToClose">Days to Close</Label>
              <Input
                id="daysToClose"
                type="number"
                placeholder="Enter days to close"
                {...form.register("daysToClose")}
              />
            </div>

           
          </div> */}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                placeholder="Enter street address"
                {...form.register("street")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Enter city"
                {...form.register("city")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                placeholder="Enter state or province"
                {...form.register("state")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="Enter postal code"
                {...form.register("postalCode")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Enter country"
                {...form.register("country")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebookPage">Facebook Page</Label>
              <Input
                id="facebookPage"
                placeholder="https://facebook.com/yourpage"
                {...form.register("facebookPage")}
              />
              {form.formState.errors.facebookPage && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.facebookPage.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitterHandle">Twitter Handle</Label>
              <Input
                id="twitterHandle"
                placeholder="@yourhandle"
                {...form.register("twitterHandle")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedInHandle">LinkedIn Handle</Label>
              <Input
                id="linkedInHandle"
                placeholder="https://www.linkedin.com/company/yourhandle"
                {...form.register("linkedInHandle")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webTechnologies">Web Technologies</Label>

            {/* --- Input and Add Button --- */}
            <div className="flex gap-2">
              <Input
                id="webTechnologies"
                placeholder="Enter a technology and press Enter"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const tech = newTech.trim();
                    if (tech) {
                      const currentTechs = form.watch("webTechnologies") || [];
                      if (!currentTechs.includes(tech)) {
                        form.setValue("webTechnologies", [
                          ...currentTechs,
                          tech,
                        ]);
                      }
                      setNewTech(""); // reset input
                    }
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  const tech = newTech.trim();
                  if (tech) {
                    const currentTechs = form.watch("webTechnologies") || [];
                    if (!currentTechs.includes(tech)) {
                      form.setValue("webTechnologies", [...currentTechs, tech]);
                    }
                    setNewTech(""); // reset input
                  }
                }}
              >
                + Add
              </Button>
            </div>

            {/* --- Display Technologies as Chips --- */}
            <div className="flex flex-wrap gap-2 pt-2">
              {(form.watch("webTechnologies") || []).map((tech, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-sm"
                >
                  <span>{tech}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      const updated = (
                        form.watch("webTechnologies") || []
                      ).filter((_, i) => i !== index);
                      form.setValue("webTechnologies", updated);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="description">Description</Label>
            <div className="relative">
              <Textarea
                id="description"
                placeholder="Enter company description"
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

          <div className="space-y-2">
            <Label htmlFor="assignedUserId">Assigned To</Label>
            <Select
              onValueChange={(value) =>
                form.setValue(
                  "assignedUserId",
                  value === "null" ? null : parseInt(value)
                )
              }
              defaultValue={
                customer?.assignedUserId !== null
                  ? customer?.assignedUserId?.toString()
                  : "null"
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="null"
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

          <div className="space-y-2 relative">
            <Label htmlFor="notes">Notes</Label>
            <div className="relative">
              <Textarea
                id="notes"
                placeholder="Enter any additional notes"
                maxLength={500} // prevent typing beyond 500 characters
                {...form.register("notes", {
                  maxLength: {
                    value: 500,
                    message: "Notes cannot exceed 500 characters",
                  },
                })}
                className="pr-14 min-h-[100px]"
              />
              {/* Live character counter */}
              <span
                className={`absolute bottom-2 right-3 text-xs ${
                  (form.watch("notes")?.length || 0) >= 500
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

          {!customer && (
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
          )}

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
                ? "Update Customer"
                : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
