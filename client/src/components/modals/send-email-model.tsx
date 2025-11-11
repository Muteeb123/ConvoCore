import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const emailArraySchema = z.string().email().or(
  z.string().refine(
    (value) => {
      if (!value) return true;
      return value.split(/[,;\s]+/).every(part => {
        if (!part) return true;
        return z.string().email().safeParse(part).success;
      });
    },
    { message: "Contains invalid email addresses" }
  )
);

const sendEmailSchema = z.object({
  to: emailArraySchema.refine(
    (value) => value && value.trim().length > 0,
    { message: "At least one recipient is required" }
  ),
  cc: emailArraySchema.optional(),
  bcc: emailArraySchema.optional(),
  subject: z.string().min(1, "Subject is required").max(100, "Subject too long"),
  message: z.string().min(1, "Message body is required"),
});

type SendEmailFormData = z.infer<typeof sendEmailSchema>;

interface EmailIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: {
    email: string;
    password: string;
    smtpHost: string;
    smtpPort: number;
  } | null;
}

export function SendMailModel({ isOpen, onClose, config }: EmailIntegrationModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [inputValues, setInputValues] = useState({
    to: "",
    cc: "",
    bcc: "",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
  });

  const watchedValues = watch();

  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: async (data: SendEmailFormData) => {
      if (!user) throw new Error("User not authenticated");

      const processEmails = (emails: string) => 
        emails.split(/[,;\s]+/).filter(email => email.trim().length > 0);

      const emailData = {
        fromEmail: config?.email || user.email,
        toEmail: processEmails(data.to).join(', '),
        ccEmail: data.cc ? processEmails(data.cc).join(', ') : undefined,
        bccEmail: data.bcc ? processEmails(data.bcc).join(', ') : undefined,
        subject: data.subject,
        body: data.message,
        isHtml: false,
        status: 'draft' as const,
        userId: user.id,
      };

      const requestBody = {
        emaildata: emailData,
        user: user
      };

      return await apiRequest("POST", "/api/emails", requestBody);
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully!", variant: "default" });
      reset();
      setFiles([]);
      setInputValues({ to: "", cc: "", bcc: "" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error sending email", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: SendEmailFormData) => {
    sendEmail(data);
  };

  const handleKeyDown = (field: 'to' | 'cc' | 'bcc', e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', 'Tab', ',', ';'].includes(e.key)) {
      e.preventDefault();
      const currentValue = inputValues[field];
      if (currentValue.trim()) {
        const currentFormValue = watchedValues[field] || '';
        const newValue = currentFormValue 
          ? `${currentFormValue}, ${currentValue}`
          : currentValue;
        
        setValue(field, newValue);
        setInputValues(prev => ({ ...prev, [field]: "" }));
      }
    }
  };

  const handleInputChange = (field: 'to' | 'cc' | 'bcc', e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const removeEmail = (field: 'to' | 'cc' | 'bcc', index: number) => {
    const currentEmails = watchedValues[field]?.split(/[,;\s]+/).filter(e => e) || [];
    const newEmails = [...currentEmails];
    newEmails.splice(index, 1);
    setValue(field, newEmails.join(', '));
  };

  const getEmailBadges = (field: 'to' | 'cc' | 'bcc') => {
    const value = watchedValues[field];
    if (!value) return null;
    
    const emails = value.split(/[,;\s]+/).filter(e => e.trim().length > 0);
    
    return emails.map((email, index) => (
      <Badge 
        key={`${field}-${index}`}
        variant="secondary"
        className="m-1"
      >
        {email}
        <button
          type="button"
          onClick={() => removeEmail(field, index)}
          className="ml-1 rounded-full hover:bg-gray-200"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    ));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Compose Email</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="to">To*</Label>
              <div className="flex flex-wrap items-center gap-1 p-1 border rounded">
                {getEmailBadges('to')}
                <input
                  id="to"
                  type="email"
                  placeholder={watchedValues.to ? "" : "recipient@example.com"}
                  value={inputValues.to}
                  onChange={(e) => handleInputChange('to', e)}
                  onKeyDown={(e) => handleKeyDown('to', e)}
                  onBlur={() => {
                    if (inputValues.to.trim()) {
                      const currentFormValue = watchedValues.to || '';
                      const newValue = currentFormValue 
                        ? `${currentFormValue}, ${inputValues.to}`
                        : inputValues.to;
                      setValue('to', newValue);
                      setInputValues(prev => ({ ...prev, to: "" }));
                    }
                  }}
                  className="flex-1 min-w-[200px] p-2 outline-none"
                />
              </div>
              {errors.to && <p className="text-red-500 text-sm mt-1">{errors.to.message}</p>}
            </div>

            <div>
              <Label htmlFor="cc">CC</Label>
              <div className="flex flex-wrap items-center gap-1 p-1 border rounded">
                {getEmailBadges('cc')}
                <input
                  id="cc"
                  type="email"
                  placeholder={watchedValues.cc ? "" : "cc@example.com"}
                  value={inputValues.cc}
                  onChange={(e) => handleInputChange('cc', e)}
                  onKeyDown={(e) => handleKeyDown('cc', e)}
                  onBlur={() => {
                    if (inputValues.cc.trim()) {
                      const currentFormValue = watchedValues.cc || '';
                      const newValue = currentFormValue 
                        ? `${currentFormValue}, ${inputValues.cc}`
                        : inputValues.cc;
                      setValue('cc', newValue);
                      setInputValues(prev => ({ ...prev, cc: "" }));
                    }
                  }}
                  className="flex-1 min-w-[200px] p-2 outline-none"
                />
              </div>
              {errors.cc && <p className="text-red-500 text-sm mt-1">{errors.cc.message}</p>}
            </div>

            <div>
              <Label htmlFor="bcc">BCC</Label>
              <div className="flex flex-wrap items-center gap-1 p-1 border rounded">
                {getEmailBadges('bcc')}
                <input
                  id="bcc"
                  type="email"
                  placeholder={watchedValues.bcc ? "" : "bcc@example.com"}
                  value={inputValues.bcc}
                  onChange={(e) => handleInputChange('bcc', e)}
                  onKeyDown={(e) => handleKeyDown('bcc', e)}
                  onBlur={() => {
                    if (inputValues.bcc.trim()) {
                      const currentFormValue = watchedValues.bcc || '';
                      const newValue = currentFormValue 
                        ? `${currentFormValue}, ${inputValues.bcc}`
                        : inputValues.bcc;
                      setValue('bcc', newValue);
                      setInputValues(prev => ({ ...prev, bcc: "" }));
                    }
                  }}
                  className="flex-1 min-w-[200px] p-2 outline-none"
                />
              </div>
              {errors.bcc && <p className="text-red-500 text-sm mt-1">{errors.bcc.message}</p>}
            </div>

            <div>
              <Label htmlFor="subject">Subject*</Label>
              <Input 
                id="subject"
                type="text" 
                placeholder="Subject" 
                {...register("subject")} 
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="message">Message*</Label>
            <Textarea 
              id="message"
              placeholder="Write your message here..." 
              rows={8}
              {...register("message")} 
              className={errors.message ? "border-red-500" : ""}
            />
            {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
          </div>

          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              isDragging ? "border-primary bg-primary/10" : "border-gray-300"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-muted-foreground">PDF, DOCX, JPG up to 10MB</p>
              <Input 
                type="file" 
                id="attachments"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => document.getElementById('attachments')?.click()}
              >
                Select Files
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments ({files.length})</Label>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setFiles([]);
                setInputValues({ to: "", cc: "", bcc: "" });
                onClose();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : "Send Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
