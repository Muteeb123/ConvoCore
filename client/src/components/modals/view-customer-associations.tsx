import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { customers, leads, contacts, opportunities, tasks, Customer, Lead, Contact, Opportunity, Task } from "@shared/schema";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, X } from "lucide-react";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
}
interface CustomerAssociations {
  leads: Lead[];
  contacts: Contact[];
  opportunities: Opportunity[];
  tasks: Task[];
}

export function ViewCustomerAssociationModal({ isOpen, onClose, customer }: CustomerModalProps) {
  if (!customer) return null;


  const activeuser = useUserStore((state) => state.user)
  const userrole = useRoleStore((state) => state.role)
  const userId = activeuser?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fallbackUrl =FALLBACK_URL;



  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const isEditing = !!customer;
  const { toast } = useToast();
  const uploadFilesMutation = useMutation({
    mutationFn: async () => {
      if (!customer || uploadedFiles.length === 0) return;

      const formData = new FormData();


      // ✅ Add the whole customer object at once
      formData.append("data", JSON.stringify(customer));

      // ✅ Add files
      uploadedFiles.forEach((file) => formData.append("files", file));

      // ✅ Send PUT request
      const response = await fetch(`/api/customers-with-files/${customer.id}`, {
        method: "PUT",
        body: formData,
      });


      if (!response.ok) {
        throw new Error("Failed to update customer with files");
      }

      const updatedCustomer = await response.json();
      return updatedCustomer;
    },
    onSuccess: (data) => {
      toast({
        title: "Files uploaded",
        description: "Customer updated successfully with new files.",
      });

      setUploadedFiles([]);
      // 🧹 Reset the actual file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      queryClient.invalidateQueries({ queryKey: ["/api/customer-files"] }); // refresh customer data
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }); // refresh customer data
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Something went wrong while updating customer.",
        variant: "destructive",
      });
    },
  });
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const deleteFileMutation = useMutation({
    mutationFn: async ({ customerId, filePath }: { customerId: number; filePath: string }) => {
      setDeletingFile(filePath); // mark this file as deleting

      const response = await fetch(`/api/customer-files/${customerId}`, {
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

      // 🧹 Update local customer state
      if (customer) {
        const filtered =
          customer.customerFiles?.filter(
            (f: any) => (typeof f === "string" ? f : f.path) !== deletedPath
          ) ?? [];

        customer.customerFiles = filtered.length > 0 ? filtered : null;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-files"] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting file",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingFile(null); // reset loading
    },
  });


  useEffect(() => {
    if (isOpen) {
      console.log('the fallback url is ',process.env.FALLBACK_URL)
      setUploadedFiles([]); // clear files every time modal opens
    }
  }, [isOpen]);

  const { data } = useQuery<CustomerAssociations>({
    queryKey: ["/api/customers/associations", customer?.id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer?.id}/associations`);
      if (!res.ok) throw new Error("Failed to fetch associations");
      return res.json();
    },
    enabled: !!customer?.id,
  });

  const relatedLeads = data?.leads || [];
  const relatedContacts = data?.contacts || [];
  const relatedOpportunities = data?.opportunities || [];
  const relatedTasks = data?.tasks || [];




  // 🧩 Fetch list of files
  const { data: customerFiles, isLoading } = useQuery({
    queryKey: ["/api/customer-files", customer?.id, userId],
    queryFn: async () => {
      const res = await fetch(`/api/customer-files?customerId=${customer?.id}`);
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!customer?.id
  });
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Associations</DialogTitle>
          <DialogDescription>
            Viewing all associations for {customer.companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Avatar className="w-8 h-8 rounded-full overflow-hidden  flex justify-center items-center">
            <AvatarImage
              src={customer.avatar ? customer.avatar : fallbackUrl}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </Avatar>


          {/* Customer Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Company</h3>
              <p>{customer.companyName}</p>
            </div>
            <div>
              <h3 className="font-medium">Status</h3>
              <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                {customer.status}
              </Badge>
            </div>
            <div>
              <h3 className="font-medium">Industry</h3>
              <p>{customer.industry || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium">Email</h3>
              <p>{customer.email || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium">Phone</h3>
              <p>{customer.phone || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium">Website</h3>
              <p>{customer.website ? (
                <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                  {customer.website}
                </a>
              ) : 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium">Location</h3>
              <p>{[customer.street, customer.city, customer.state, customer.country].filter(Boolean).join(', ') || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium">Revenue</h3>
              <p>{customer.annualRevenue ? `$${customer.annualRevenue.toLocaleString()}` : 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium">Employees</h3>
              <p>{customer.numOfEmployees || 'N/A'}</p>
            </div>
          </div>

          {/* Tabs for related entities */}
          <Tabs defaultValue="leads" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="leads">Leads ({relatedLeads.length})</TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({relatedContacts.length})</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities ({relatedOpportunities.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({relatedTasks.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({customerFiles?.length || 0})</TabsTrigger>
            </TabsList>

            {/* Leads Tab */}
            <TabsContent value="leads">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedLeads.length > 0 ? (
                    relatedLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>{lead.name}</TableCell>
                        <TableCell>
                          <Badge variant={lead.status === 'new' ? 'outline' : lead.status === 'qualified' ? 'default' : 'secondary'}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{lead.value ? `$${lead.value}` : 'N/A'}</TableCell>
                        <TableCell>{lead.source || 'N/A'}</TableCell>
                        <TableCell>{lead.probability}%</TableCell>
                        <TableCell>{lead.assignedUserName || 'Unassigned'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No leads associated with this customer
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedContacts.length > 0 ? (
                    relatedContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>{`${contact.firstName} ${contact.lastName}`}</TableCell>
                        <TableCell>{contact.email || 'N/A'}</TableCell>
                        <TableCell>{contact.phone || 'N/A'}</TableCell>
                        <TableCell>{contact.jobTitle || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={contact.isActive ? 'default' : 'destructive'}>
                            {contact.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{contact.assignedUserName || 'Unassigned'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No contacts associated with this customer
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Opportunities Tab */}
            <TabsContent value="opportunities">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Close Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedOpportunities.length > 0 ? (
                    relatedOpportunities.map((opp) => (
                      <TableRow key={opp.id}>
                        <TableCell>{opp.name}</TableCell>
                        <TableCell>{opp.stage}</TableCell>
                        <TableCell>{opp.value ? `$${opp.value.toLocaleString()}` : 'N/A'}</TableCell>
                        <TableCell>{opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            opp.isClosedWon ? 'default' :
                              opp.isClosedLost ? 'destructive' :
                                'outline'
                          }>
                            {opp.isClosedWon ? 'Won' : opp.isClosedLost ? 'Lost' : 'Open'}
                          </Badge>
                        </TableCell>
                        <TableCell>{opp.assignedUserName || 'Unassigned'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No opportunities associated with this customer
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Related To</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedTasks.length > 0 ? (
                    relatedTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                              task.status === 'pending' ? 'outline' :
                                'secondary'
                          }>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            task.priority === 'high' ? 'destructive' :
                              task.priority === 'medium' ? 'secondary' :
                                // task.priority === 'medium' ? 'warning' :
                                'default'
                          }>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                          {task.customerName && 'Customer'}
                          {task.leadName && `Lead: ${task.leadName}`}
                          {task.opportunityName && `Opportunity: ${task.opportunityName}`}
                          {!task.customerName && !task.leadName && !task.opportunityName && 'N/A'}
                        </TableCell>
                        <TableCell>{task.assignedUserId ? `User ${task.assignedUserId}` : 'Unassigned'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No tasks associated with this customer
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            {/* Documents Tab */}
            <TabsContent value="documents">
              {/* Upload section */}
              <div className="space-y-4 p-4 border rounded-lg mb-4">
                <div className="space-y-2">
                  <Label htmlFor="customerFiles">Upload Files</Label>
                  <Input
                    id="customerFiles"
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
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <button
                          onClick={() =>
                            setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
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
                      {uploadFilesMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>

                  </div>
                )}
              </div>

              {/* Documents table (already uploaded files only) */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerFiles?.length > 0 ? (
                    customerFiles?.map((file: any, index: number) => {
                      // In case backend hasn't yet been updated and file is still a string
                      // console.log(`The existing files are : ${JSON.stringify(file)}`);
                      // const name = file.name.split("/").pop()?.replace(/^\d+-/, "");
                      // const uploadedAt = customer.updatedAt;

                      return (
                        <TableRow key={index}>
                          <TableCell>{file.name}</TableCell>
                          <TableCell>{file.lastModified}</TableCell>
                          <TableCell> {file.size
                            ? `${(file.size / 1024).toFixed(2)} KB`
                            : "—"}</TableCell>

                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(`/api/customer-files/${encodeURIComponent(file.path)}`, "_blank")
                                }                              >
                                <Download className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  toast({
                                    title: "Confirm Deletion",
                                    description: "Are you sure you want to delete this file?",
                                    action: (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          deleteFileMutation.mutate({
                                            customerId: customer.id,
                                            filePath: file.path,
                                          });
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    ),
                                  });
                                }}
                              >
                                <Trash2 size={24} />
                              </Button>


                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No files uploaded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>

              </Table>
            </TabsContent>




          </Tabs>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}