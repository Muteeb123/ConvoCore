import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function ViewUserModel({
  isOpen,
  onClose,
  Selecteduser,
}: ViewUserModelProps) {
  if (!Selecteduser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">First Name</p>
                <p className="font-medium">{Selecteduser.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Name</p>
                <p className="font-medium">{Selecteduser.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">{Selecteduser.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{Selecteduser.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-lg font-semibold">Account Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={Selecteduser.isActive ? "default" : "destructive"}>
                  {Selecteduser.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium">{Selecteduser.rolename || "No role assigned"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-lg font-semibold">Timestamps</h3>
            <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">
                {Selecteduser.createdAt ? format(new Date(Selecteduser.createdAt), "PPpp") : "N/A"}
              </p>
            </div>

            {Selecteduser.updatedAt &&
              Selecteduser.createdAt &&
              new Date(Selecteduser.updatedAt).getTime() !== new Date(Selecteduser.createdAt).getTime() && (
                <div>
                  <p className="text-sm text-muted-foreground">Updated At</p>
                  <p className="font-medium">
                    {format(new Date(Selecteduser.updatedAt), "PPpp")}
                  </p>
                </div>
            )}

              {Selecteduser.lastLogin && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {format(new Date(Selecteduser.lastLogin), "PPpp")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ViewUserModelProps {
  isOpen: boolean;
  onClose: () => void;
  Selecteduser: User | null;
}