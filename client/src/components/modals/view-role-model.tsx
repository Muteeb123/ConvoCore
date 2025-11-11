import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Role } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ViewRoleModelProps {
  isOpen: boolean;
  onClose: () => void;
  Selectedrole: Role | null;
}

export function ViewRoleModel({ isOpen, onClose, Selectedrole }: ViewRoleModelProps) {
  if (!Selectedrole) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Role Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Basic Information Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-lg">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{Selectedrole.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">
                    {!Selectedrole.createdAt ? "N/A" : format(new Date(Selectedrole.createdAt), "PPpp")}
                </p>
              </div>
              {Selectedrole.updatedAt &&
               Selectedrole.createdAt &&
               <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {Selectedrole.updatedAt
                    ? format(new Date(Selectedrole.updatedAt), "PPpp")
                    : "N/A"}
                </p>
              </div>}
            </div>
          </div>

          {/* Description Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-lg">Description</h3>
            <p className="text-muted-foreground">
              {Selectedrole.description || "No description provided"}
            </p>
          </div>

          {/* Permissions Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-lg">Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {Selectedrole.permissions && Selectedrole.permissions.length > 0 ? (
                Selectedrole.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">No permissions assigned</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}