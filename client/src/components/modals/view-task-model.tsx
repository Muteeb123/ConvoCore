import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Task } from "@shared/schema";
import { Checkbox } from "../ui/checkbox";

interface ViewTaskModelProps {
  isOpen: boolean;
  onClose: () => void;
  SelectedTask: Task | null;
}

export function ViewtaskModel({
  isOpen,
  onClose,
  SelectedTask,
}: ViewTaskModelProps) {
  if (!SelectedTask) return null;

  console.log(SelectedTask)
    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{SelectedTask.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{SelectedTask.description || "No description"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    SelectedTask.status === "completed" ? "default" : "outline"
                  }
                >
                  {SelectedTask.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge
                  variant={
                    SelectedTask.priority === "high"
                      ? "destructive"
                      : SelectedTask.priority === "medium"
                      ? "secondary"
                      : "default"
                  }
                >
                  {SelectedTask.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p>
                  {SelectedTask.dueDate
                    ? format(new Date(SelectedTask.dueDate), "MMM dd, yyyy")
                    : "No due date"}
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Dates</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p>
                  {SelectedTask.createdAt
                    ? format(
                        new Date(SelectedTask.createdAt),
                        "MMM dd, yyyy HH:mm"
                      )
                    : "No creation date"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p>
                  {SelectedTask.updatedAt
                    ? format(
                        new Date(SelectedTask.updatedAt),
                        "MMM dd, yyyy HH:mm"
                      )
                    : "No update date"}
                </p>
              </div>
              {SelectedTask.completedDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed At</p>
                  <p>
                    {format(
                      new Date(SelectedTask.completedDate),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Related Entities */}
          {(SelectedTask.leadName ||
            SelectedTask.customerName ||
            SelectedTask.opportunityName) && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Related Entities</h3>
              <div className="grid grid-cols-2 gap-4">
                {SelectedTask.leadName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lead</p>
                    <p>{SelectedTask.leadName}</p>
                  </div>
                )}
                {SelectedTask.customerName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p>{SelectedTask.customerName}</p>
                  </div>
                )}
                {SelectedTask.opportunityName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Opportunity</p>
                    <p>{SelectedTask.opportunityName}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* People */}
          {(SelectedTask.assignedUseName || SelectedTask.createdUserName) && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">People</h3>
              <div className="grid grid-cols-2 gap-4">
                {SelectedTask.assignedUseName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p>{SelectedTask.assignedUseName}</p>
                  </div>
                )}
                {SelectedTask.createdUserName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p>{SelectedTask.createdUserName}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Additional Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Duration (hrs)</p>
                <p>{SelectedTask.duration || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Effort (hrs)</p>
                <p>{SelectedTask.effort || 0}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Dependencies</p>
                <p>{SelectedTask.dependencies || "None"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p>{SelectedTask.notes || "No notes"}</p>
              </div>
            </div>
          </div>

          {/* Labels */}
          {SelectedTask.labels && SelectedTask.labels.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {SelectedTask.labels.map((label, idx) => (
                  <Badge key={idx} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {SelectedTask.attachments && SelectedTask.attachments.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Attachments</h3>
              <ul className="list-disc pl-5 space-y-1">
                {SelectedTask.attachments.map((file, idx) => (
                  <li key={idx}>
                    <a
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {file.split("/").pop()}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* ✅ Checklist Section */}
          {SelectedTask.checklist && SelectedTask.checklist.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Checklist</h3>
              <ul className="space-y-2">
                {SelectedTask.checklist.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between border rounded-md p-2"
                  >
                    <div className="flex items-center gap-2">
                     <Checkbox checked={item.status === "done"} disabled />

                      <span
                        className={
                          item?.item
                            ? " text-muted-foreground"
                            : ""
                        }
                      >
                        {item?.item}
                      </span>
                    </div>
                    <Badge
                      variant="default"
                      className="text-xs"
                    >
                      {item.status }
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        
        </div>
      </DialogContent>
    </Dialog>
  );
}
