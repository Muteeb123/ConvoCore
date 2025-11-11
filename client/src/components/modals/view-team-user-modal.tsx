
  import React, { useEffect, useState } from "react";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  import { Separator } from "@/components/ui/separator";
  import { Button } from "@/components/ui/button";
  import { X } from "lucide-react";
  import { TeamWithMembers } from "@shared/schema";
  import { apiRequest, queryClient } from "@/lib/queryClient";
  import { useToast } from "@/hooks/use-toast";
  import { useRoleStore, useUserStore } from "@/stores/useRoleStore";


  interface RoleMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: TeamWithMembers | null;
    role: "manager" | "associate" | "team-lead" | null;
    permissions: {
      createTeam: boolean;
      editTeam: boolean;
      deleteTeam: boolean;
      viewTeam: boolean;
    };
  }

  export function RoleMembersModal({
    isOpen,
    onClose,
    team,
    role,
    permissions
  }: RoleMembersModalProps) {
    const { toast } = useToast();
    const [removedIds, setRemovedIds] = useState<number[]>([]);

    
    const activeuser = useUserStore((state) => state.user);
    const userrole = useRoleStore((state) => state.role);

    const admin = activeuser?.userType ==="admin" || userrole?.permissions?.includes("all");
    const canDeleteMember = (memberType: string | null) => {
      if (!permissions.editTeam) return false; // must have edit permission first
      if (!activeuser?.userType) return false;
      if (!memberType) return false; // member type is null
      if(admin) return true;

      switch (activeuser.userType) {
        case "admin":
          return true; // admin can delete anyone
        case "manager":
          return memberType === "associate" || memberType === "team-lead";
        case "team-lead":
          return memberType === "associate";
        case "associate":
          return false;
        default:
          return false;
      }
    };


    // Reset removedIds when modal closes or when team/role changes
    useEffect(() => {
      if (!isOpen) {
        setRemovedIds([]);
      }
    }, [isOpen]);

    useEffect(() => {
      setRemovedIds([]);
    }, [team?.id, role]);

    if (!team || !role) return null;

    const members = team.members?.filter((m) => m.user.userType === role) || [];

    // remove from UI (soft remove, before updating DB)
    const handleRemove = (userId: number) => {
      setRemovedIds((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
    };

    // persist updates to DB
    const handleUpdate = async () => {
      try {
        await apiRequest("DELETE", `/api/teams/${team.id}/members`, {
          userIds: removedIds,
        });

        queryClient.invalidateQueries({ queryKey: ["myTeams"] });
        queryClient.invalidateQueries({ queryKey: ["teams"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });
        toast({
          title: "Updated",
          description: `${removedIds.length} member(s) removed successfully.`,
        });
        setRemovedIds([]); // clear after success
        onClose();
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update members.",
          variant: "destructive",
        });
      }
    };

    const filteredMembers = members.filter(
      (m) => !removedIds.includes(m.userId)
    );

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>
              {role === "manager" && "Managers"}
              {role === "associate" && "Associates"}
              {role === "team-lead" && "Team Leads"}
            </DialogTitle>
            <DialogDescription>
              Showing {filteredMembers.length} {role}(s) for team {team.name}
            </DialogDescription>
          </DialogHeader>

          {filteredMembers.length === 0 ? (
            <p className="text-sm text-gray-500">No {role}s found in this team.</p>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <span className="font-medium">{member.user.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canDeleteMember(member.user.userType)}
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleRemove(member.userId)}
                  >
                    <X className="w-4 h-4" />
                  </Button>

                </div>
              ))}
            </div>
          )}

          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRemovedIds([]); // reset if user cancels
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={removedIds.length === 0}
              className="bg-primary text-white"
            >
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
