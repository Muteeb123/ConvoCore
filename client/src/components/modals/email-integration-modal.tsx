import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertEmailConfigurationSchema, EmailConfiguration } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect } from "react";

const emailConfigFormSchema = insertEmailConfigurationSchema.extend({
  provider: z.string().min(1, "Provider is required"),
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  username: z.string().min(1, "Username is required"),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  imapHost: z.string().min(1, "IMAP host is required"),
  imapPort: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  password: z.string().min(1, "Password is required"),
});

type EmailConfigFormData = z.infer<typeof emailConfigFormSchema>;

interface EmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: EmailConfiguration | null;
}

export function EmailIntegrationModal({ isOpen, onClose, config }: EmailIntegrationModalProps) {
  const { toast } = useToast();
  const isEditing = !!config;

  const form = useForm<EmailConfigFormData>({
    resolver: zodResolver(emailConfigFormSchema),
    defaultValues: {
      provider: config?.provider || "",
      email: config?.email || "",
      smtpHost: config?.smtpHost || "",
      smtpPort: config?.smtpPort || 587,
      imapHost: config?.imapHost || "",
      imapPort: config?.imapPort || 993,
      username: config?.username || "",
      password: "",
      isActive: config?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        provider: config?.provider || "",
        email: config?.email || "",
        smtpHost: config?.smtpHost || "",
        smtpPort: config?.smtpPort || 587,
        imapHost: config?.imapHost || "",
        imapPort: config?.imapPort || 993,
        username: config?.username || "",
        password: "",
        isActive: config?.isActive ?? true,
      });
    }
  }, [config, isOpen, form]); 

  const createMutation = useMutation({
    mutationFn: async (data: EmailConfigFormData) => {
      const payload = {
        ...data,
        password: isEditing && !data.password ? undefined : data.password,
      };
      const res = await apiRequest("POST", "/api/email-config", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      toast({
        title: "Email configuration created",
        description: "Your email configuration has been successfully created.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create email configuration.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmailConfigFormData) => {
      const payload = {
        ...data,
        password: !data.password ? undefined : data.password,
      };
      const res = await apiRequest("PUT", `/api/email-config/${config!.id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      toast({
        title: "Email configuration updated",
        description: "Your email configuration has been successfully updated.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: EmailConfigFormData) => {
      const res = await apiRequest("POST", "/api/email-config/test", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test successful",
        description: "Email configuration test passed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message || "Email configuration test failed. Please check your settings.",
        variant: "destructive",
      });
    },
  });

const handleSubmit = async (data: EmailConfigFormData) => {
  try {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      return;
    }
    if (isEditing) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  } catch (error) {
    console.error("Submission error:", error);
    toast({
      title: "Error",
      description: "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
  }
};

  const handleTest = async () => {
    try {
      await form.trigger();
      if (!form.formState.isValid) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields correctly before testing.",
          variant: "destructive",
        });
        return;
      }

      const data = form.getValues();
      await testMutation.mutateAsync(data);
    } catch (error) {
      console.error("Test error:", error);
    }
  };

  const handleProviderChange = (provider: string) => {
    form.setValue("provider", provider);
    
    switch (provider) {
      case "Gmail":
        form.setValue("smtpHost", "smtp.gmail.com");
        form.setValue("smtpPort", 587);
        form.setValue("imapHost", "imap.gmail.com");
        form.setValue("imapPort", 993);
        break;
      case "Outlook":
        form.setValue("smtpHost", "smtp.office365.com");
        form.setValue("smtpPort", 587);
        form.setValue("imapHost", "outlook.office365.com");
        form.setValue("imapPort", 993);
        break;
      case "Custom SMTP":
        form.setValue("smtpHost", "");
        form.setValue("smtpPort", 587);
        form.setValue("imapHost", "");
        form.setValue("imapPort", 993);
        break;
      default:
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Email Integration Setup</DialogTitle>
          <DialogDescription>
            Configure your email provider settings to enable email functionality.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Email Provider *</Label>
              <Select 
                onValueChange={handleProviderChange} 
                value={form.watch("provider")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gmail">Gmail</SelectItem>
                  <SelectItem value="Outlook">Outlook</SelectItem>
                  <SelectItem value="Custom SMTP">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.provider && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.provider.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Usually your email address"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">App Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="App-specific password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Server *</Label>
              <Input
                id="smtpHost"
                placeholder="smtp.gmail.com"
                {...form.register("smtpHost")}
              />
              {form.formState.errors.smtpHost && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.smtpHost.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port *</Label>
              <Input
                id="smtpPort"
                type="number"
                placeholder="587"
                {...form.register("smtpPort", { 
                  valueAsNumber: true,
                  validate: (value) => value > 0 && value <= 65535 || "Invalid port number"
                })}
              />
              {form.formState.errors.smtpPort && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.smtpPort.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="imapHost">IMAP Server *</Label>
              <Input
                id="imapHost"
                placeholder="imap.gmail.com"
                {...form.register("imapHost")}
              />
              {form.formState.errors.imapHost && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.imapHost.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imapPort">IMAP Port *</Label>
              <Input
                id="imapPort"
                type="number"
                placeholder="993"
                {...form.register("imapPort", { 
                  valueAsNumber: true,
                  validate: (value) => value > 0 && value <= 65535 || "Invalid port number"
                })}
              />
              {form.formState.errors.imapPort && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.imapPort.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={!!form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Enable Email Sync</Label>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-secondary hover:bg-secondary/90"
            >
              {createMutation.isPending || updateMutation.isPending
                ? (isEditing ? "Updating..." : "Creating...")
                : (isEditing ? "Update Configuration" : "Save Configuration")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}