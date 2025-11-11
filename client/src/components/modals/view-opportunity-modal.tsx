import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Opportunity } from "@shared/schema";
import { format } from "date-fns";
import { Download, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUserStore } from "@/stores/useRoleStore";
import { stat } from "fs";

interface ViewOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
}

function getStageColor(stage: string) {
  switch (stage) {
    case "prospecting":
      return "bg-blue-100 text-blue-800";
    case "qualification":
      return "bg-yellow-100 text-yellow-800";
    case "proposal":
      return "bg-orange-100 text-orange-800";
    case "negotiation":
      return "bg-purple-100 text-purple-800";
    case "closed":
      return "bg-green-100 text-green-800";
    case "lost":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusBadges(opportunity: Opportunity) {
  return (
    <div className="flex gap-2">
      {opportunity.isClosedWon && (
        <Badge className="bg-green-100 text-green-800">Won</Badge>
      )}
      {opportunity.isClosedLost && (
        <Badge className="bg-red-100 text-red-800">Lost</Badge>
      )}
      {opportunity.isDealClosed && (
        <Badge className="bg-purple-100 text-purple-800">Closed</Badge>
      )}
    </div>
  );
}

export function ViewOpportunityModal({
  isOpen,
  onClose,
  opportunity,
}: ViewOpportunityModalProps) {
  if (!opportunity) return null;

  const formatDate = (date?: string | Date | null) =>
    date ? format(new Date(date), "MMM dd, yyyy") : "—";
  const formatDateTime = (date?: string | Date | null) =>
    date ? format(new Date(date), "MMM dd, yyyy HH:mm") : "—";
  const formatValue = (value?: string | number | null) =>
    value ? `$${parseFloat(value.toString()).toLocaleString()}` : "—";

  const userId = useUserStore((state) => state.user?.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const deleteFileMutation = useMutation({
    mutationFn: async ({
      opportunityId,
      filePath,
    }: {
      opportunityId: number;
      filePath: string;
    }) => {
      setDeletingFile(filePath); // mark this file as deleting

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

      // 🧹 Update local customer state
      if (opportunity) {
        const filtered =
          opportunity.opportunityFiles?.filter(
            (f: any) => (typeof f === "string" ? f : f.path) !== deletedPath
          ) ?? [];

        opportunity.opportunityFiles = filtered.length > 0 ? filtered : null;
      }

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
      setDeletingFile(null); // reset loading
    },
  });

  useEffect(() => {
    if (isOpen) {
      setUploadedFiles([]); // clear files every time modal opens
    }
  }, [isOpen]);

  const { data: opportunityFiles, isLoading } = useQuery({
    queryKey: ["/api/opportunity-files", opportunity?.id, userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/gcp-files?id=${opportunity?.id}&pre=opportunity`
      );
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!opportunity?.id,
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async () => {
      if (!opportunity || uploadedFiles.length === 0) return;

      const formData = new FormData();

      // ✅ Add the whole customer object at once
      formData.append("data", JSON.stringify(opportunity));

      // ✅ Add files
      uploadedFiles.forEach((file) => formData.append("files", file));

      // ✅ Send PUT request
      const response = await fetch(
        `/api/opportunities-with-files/${opportunity.id}`,
        {
          method: "PUT",
          body: formData,
        }
      );

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

      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-files"] }); // refresh customer data
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] }); // refresh customer data
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Something went wrong while updating opportunity.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opportunity Details</DialogTitle>
          <DialogDescription>
            Viewing full details for <strong>{opportunity.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Basic Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
          <div>
            <h3 className="font-medium">Stage</h3>
            <Badge className={getStageColor(opportunity.stage || "")}>
              {opportunity.stage || "Unknown"}
            </Badge>
          </div>
          <div>
            <h3 className="font-medium">Status</h3>
            {getStatusBadges(opportunity)}
          </div>
          <div>
            <h3 className="font-medium">Value</h3>
            <p>{formatValue(opportunity.value)}</p>
          </div>
          <div>
            <h3 className="font-medium">Type</h3>
            <p>{opportunity.type || "N/A"}</p>
          </div>
          <div>
            <h3 className="font-medium">Priority</h3>
            <p>{opportunity.priority || "Not set"}</p>
          </div>
          <div>
            <h3 className="font-medium">Pipeline</h3>
            <p>{opportunity.pipeline || "Not set"}</p>
          </div>
        </div>

        {/* Tabs for Detailed Info */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
            <TabsTrigger value="documents">
              Documents({opportunityFiles?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>{opportunity.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>{opportunity.description || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Next Step</TableCell>
                  <TableCell>{opportunity.nextStep || "Not set"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Latest Traffic Source</TableCell>
                  <TableCell>
                    {opportunity.latestTrafficSource || "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          {/* Dates Tab */}
          <TabsContent value="dates">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Type</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Expected Close</TableCell>
                  <TableCell>
                    {formatDate(opportunity.expectedCloseDate)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Actual Close</TableCell>
                  <TableCell>
                    {formatDateTime(opportunity.actualCloseDate)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Owner Assigned</TableCell>
                  <TableCell>
                    {formatDateTime(opportunity.ownerAssignedDate)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Created</TableCell>
                  <TableCell>{formatDateTime(opportunity.createdAt)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Updated</TableCell>
                  <TableCell>{formatDateTime(opportunity.updatedAt)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Last Contacted</TableCell>
                  <TableCell>
                    {formatDateTime(opportunity.lastContacted)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Name / ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Created By</TableCell>
                  <TableCell>
                    {opportunity.createdByUserName ||
                      opportunity.createdByUserId ||
                      null}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>
                    {opportunity.assignedUserName ||
                      opportunity.assignedUserId ||
                      null}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell>
                    {opportunity.leadName || opportunity.leadId || null}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>
                    {opportunity.companyName || opportunity.customerId || null}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Associated Contact</TableCell>
                  <TableCell>
                    {opportunity.associatedContactName ||
                      opportunity.associatedContact ||
                      null}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Times Contacted</TableCell>
                  <TableCell>{opportunity.numberOfTimesContacted}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Associated Contacts</TableCell>
                  <TableCell>
                    {opportunity.numberOfAssociatedContacts}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Sales Activities</TableCell>
                  <TableCell>{opportunity.numberOfSalesActivities}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          {/* Additional Info Tab */}
          <TabsContent value="additional">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunity.tags && opportunity.tags.length > 0 && (
                  <TableRow>
                    <TableCell>Tags</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>Associated Task</TableCell>
                  <TableCell>{opportunity.associatedTask || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Associated Note</TableCell>
                  <TableCell>{opportunity.associatedNote || "—"}</TableCell>
                </TableRow>
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
                      <span className="truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <button
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
                {opportunityFiles?.length > 0 ? (
                  opportunityFiles?.map((file: any, index: number) => {
                    // In case backend hasn't yet been updated and file is still a string
                    // console.log(`The existing files are : ${JSON.stringify(file)}`);
                    // const name = file.name.split("/").pop()?.replace(/^\d+-/, "");
                    // const uploadedAt = customer.updatedAt;

                    return (
                      <TableRow key={index}>
                        <TableCell>{file.name}</TableCell>
                        <TableCell>{file.lastModified}</TableCell>
                        <TableCell>
                          {" "}
                          {file.size
                            ? `${(file.size / 1024).toFixed(2)} KB`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
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
                              disabled={opportunity.stage === "closed won"}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
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
                                          opportunityId: opportunity.id,
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

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
