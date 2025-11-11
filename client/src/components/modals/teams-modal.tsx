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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Team, TeamWithMembers, insertTeamSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { FALLBACK_URL } from "@/constants/data";

// Extended schema - keep all FKs as numbers
const requiredTeamSchema = insertTeamSchema.extend({
  name: z.string().min(1, "The Team name is required"),
  description: z.string().optional(),
  associateIds: z.array(z.number()).optional(),
  managerIds: z.array(z.number()).optional(),
  teamleadIds: z.array(z.number()).optional(),
  roleId: z.number().min(1, "Role is required"),
});

type TeamFormData = z.infer<typeof requiredTeamSchema>;

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: TeamWithMembers | null;
  permissions: {
    createTeam: boolean;
    editTeam: boolean;
    deleteTeam: boolean;
    viewTeam: boolean;
  };
}

export function TeamModal({
  isOpen,
  onClose,
  team: teamToEdit,
  permissions,
}: TeamModalProps) {
  const { toast } = useToast();
  const activeuser = useUserStore((state) => state.user);
  const userrole = useRoleStore((state) => state.role);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const fallbackUrl = FALLBACK_URL;
  const [profilePicUrl, setProfilePicUrl] = useState<any>(fallbackUrl);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(`/api/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch(`/api/roles`);
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const { data: teams = [] } = useQuery<TeamWithMembers[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch(`/api/teams`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
  });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(requiredTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      associateIds: [],
      managerIds: [],
      teamleadIds: [],
      roleId: 0,
    },
  });
  // Separate users by role
  const associates = users.filter(
    (u: any) => u.userType === "associate" && u.isActive
  );
  const managers = users.filter(
    (u: any) => u.userType === "manager" && u.isActive
  );
  const teamleads = users.filter(
    (u: any) => u.userType === "team-lead" && u.isActive
  );
  const admin =
    activeuser?.userType === "admin" || userrole?.permissions?.includes("all");

  const canEditRole = (memberType: "associate" | "team-lead" | "manager") => {
    if (admin) return true;
    if (!permissions.editTeam || !activeuser?.userType) return false;

    switch (activeuser.userType) {
      case "admin":
        return true; // admin can edit anyone
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

  const actualTeam: TeamWithMembers | null = teamToEdit
    ? "team" in teamToEdit
      ? (teamToEdit.team as TeamWithMembers)
      : (teamToEdit as TeamWithMembers)
    : null;
  useEffect(() => {
    if (isOpen) {
      if (actualTeam) {
        // editing
        const associateIds =
          actualTeam.members
            ?.filter((m: any) => m.user.userType === "associate")
            .map((m: any) => m.user.id) || [];

        const managerIds =
          actualTeam.members
            ?.filter((m: any) => m.user.userType === "manager")
            .map((m: any) => m.user.id) || [];

        const teamleadIds =
          actualTeam.members
            ?.filter((m: any) => m.user.userType === "team-lead")
            .map((m: any) => m.user.id) || [];

        form.reset({
          name: actualTeam.name,
          description: actualTeam.description || "",
          associateIds,
          managerIds,
          teamleadIds,
          roleId: actualTeam.roleId || 0,

        });
        if (actualTeam.avatar) {

          setProfilePicUrl(actualTeam.avatar);
          setProfilePicture(null);
        }
      } else {
        setProfilePicUrl(fallbackUrl)
        setProfilePicture(null);
        // creating
        form.reset({
          name: "",
          description: "",
          associateIds: [],
          managerIds: [],
          teamleadIds: [],
          roleId: 0,
        });
      }
    }
  }, [isOpen, actualTeam, form]);

  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const sanitizedData = sanitize(data);
      const res = await fetch(`/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedData)
      });

      if (!res.ok) throw new Error("Failed to create team");
      const createdTeam = await res.json();

      if (profilePicture) {
        const avatarFormData = new FormData();
        avatarFormData.append("file", profilePicture);

        const uploadRes = await fetch(`/api/teams/${createdTeam.id}/avatar`, {
          method: "PUT",
          body: avatarFormData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload team avatar");
        const updatedTeam = await uploadRes.json();
        return updatedTeam;
      }

      return createdTeam;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
      toast({ title: "Team created successfully!" });
      onClose();
    },

    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });




  // UPDATE team
  const updateTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      if (!actualTeam) throw new Error("No team to update");

      const sanitizedData = sanitize(data);

      const res = await fetch(`/api/teams/${actualTeam.id}`, {
        headers: { "Content-Type": "application/json" },
        method: "PUT",
        body: JSON.stringify(sanitizedData),
      });

      if (!res.ok) throw new Error("Failed to update team");

      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);

        const uploadRes = await fetch(`/api/teams/${actualTeam.id}/avatar`, {
          method: "PUT",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload team avatar");
        const updatedTeam = await uploadRes.json();
        return updatedTeam;
      }
      return res.json();

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
      toast({ title: "Team updated successfully!" });
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sanitize = (data: TeamFormData): TeamFormData => {
    return {
      name: data.name.trim(),
      description: data.description?.trim() || "",
      associateIds: data.associateIds || undefined,
      managerIds: data.managerIds || undefined,
      teamleadIds: data.teamleadIds || undefined,
      roleId: data.roleId,
      avatar: profilePicUrl
    };
  };
  const handleSubmit = async (data: TeamFormData) => {
    const isValid = await form.trigger();
    if (!isValid) return;

    try {
      if (actualTeam) {
        await updateTeamMutation.mutateAsync(data);
      } else {
        await createTeamMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error submitting team form:", error);
    }
  };


  // const handleSubmit = async (data: TeamFormData) => {
  //   const isValid = await form.trigger();
  //   if (!isValid) return;
  //   try {
  //     await mutation.mutateAsync(sanitize(data));
  //   } catch (error) {
  //     console.log("Error while submitting team form: ", error);
  //   }
  // };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{teamToEdit ? "Edit Team" : "Create Team"}</DialogTitle>
          <DialogDescription>
            {teamToEdit
              ? "Update the team details below."
              : "Fill in the details to create a new team."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2 flex justify-center">
            <div>
              {/* Profile Preview with Edit Button */}
              <div className="relative group">

                <img
                  src={profilePicture ? URL.createObjectURL(profilePicture) : profilePicUrl}
                  alt="Team Profile"
                  className="w-20 h-20 rounded-full object-cover shadow-sm border"
                />

                <button
                  type="button"
                  onClick={() => document.getElementById("profilePicInput")?.click()}
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
          {/* Team Name */}
          <div>
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              placeholder="Enter team name"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter team description (optional)"
              {...form.register("description")}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Role Select */}
          <div>
            <Label>Role *</Label>
            <Select
              onValueChange={(value) => form.setValue("roleId", Number(value))}
              value={
                form.watch("roleId") ? String(form.watch("roleId")) : undefined
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role: any) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.roleId && (
              <p className="text-sm text-red-500">
                {form.formState.errors.roleId.message}
              </p>
            )}
          </div>

          {/* Associates Multi-Select */}
          <div>
            <Label>Associates</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!canEditRole("associate")}
                  className="w-full justify-between"
                >
                  {(form.watch("associateIds") || []).length
                    ? `${(form.watch("associateIds") || []).length} selected`
                    : "Select associates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandGroup>
                    {associates.map((user: any) => {
                      const isSelected = form
                        .watch("associateIds")
                        ?.includes(user.id);
                      return (
                        <CommandItem
                          key={user.id}
                          onSelect={() => {
                            const prev = form.getValues("associateIds") ?? [];
                            form.setValue(
                              "associateIds",
                              isSelected
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mr-2"
                          />
                          {user.firstName} {user.lastName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.watch("associateIds") ?? []).map((id) => {
                const u = associates.find((a: any) => a.id === id);
                if (!u) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {u.firstName} {u.lastName}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      style={{
                        pointerEvents: canEditRole("associate")
                          ? "auto"
                          : "none",
                        opacity: canEditRole("associate") ? 1 : 0.5,
                      }}
                      onClick={() =>
                        form.setValue(
                          "associateIds",
                          (form.watch("associateIds") ?? []).filter(
                            (x) => x !== id
                          )
                        )
                      }
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Team Leads Multi-Select */}
          <div>
            <Label>Team Leads</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!canEditRole("team-lead")}
                  className="w-full justify-between"
                >
                  {(form.watch("teamleadIds") || []).length
                    ? `${(form.watch("teamleadIds") || []).length} selected`
                    : "Select team leads"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandGroup>
                    {teamleads.map((user: any) => {
                      const isSelected = form
                        .watch("teamleadIds")
                        ?.includes(user.id);
                      return (
                        <CommandItem
                          key={user.id}
                          onSelect={() => {
                            const prev = form.getValues("teamleadIds") ?? [];
                            form.setValue(
                              "teamleadIds",
                              isSelected
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mr-2"
                          />
                          {user.firstName} {user.lastName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.watch("teamleadIds") ?? []).map((id) => {
                const u = teamleads.find((t: any) => t.id === id);
                if (!u) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {u.firstName} {u.lastName}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      style={{
                        pointerEvents: canEditRole("team-lead")
                          ? "auto"
                          : "none",
                        opacity: canEditRole("team-lead") ? 1 : 0.5,
                      }}
                      onClick={() =>
                        form.setValue(
                          "teamleadIds",
                          (form.watch("teamleadIds") ?? []).filter(
                            (x) => x !== id
                          )
                        )
                      }
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Managers Multi-Select */}
          <div>
            <Label>Managers</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!canEditRole("manager")}
                  className="w-full justify-between"
                >
                  {(form.watch("managerIds") || []).length
                    ? `${(form.watch("managerIds") || []).length} selected`
                    : "Select managers"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandGroup>
                    {managers.map((user: any) => {
                      const isSelected = form
                        .watch("managerIds")
                        ?.includes(user.id);
                      return (
                        <CommandItem
                          key={user.id}
                          onSelect={() => {
                            const prev = form.getValues("managerIds") ?? [];
                            form.setValue(
                              "managerIds",
                              isSelected
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mr-2"
                          />
                          {user.firstName} {user.lastName}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {(form.watch("managerIds") ?? []).map((id) => {
                const u = managers.find((m: any) => m.id === id);
                if (!u) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {u.firstName} {u.lastName}
                    <X
                      style={{
                        pointerEvents: canEditRole("manager") ? "auto" : "none",
                        opacity: canEditRole("manager") ? 1 : 0.5,
                      }}
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        form.setValue(
                          "managerIds",
                          (form.watch("managerIds") ?? []).filter(
                            (x) => x !== id
                          )
                        )
                      }
                    />
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createTeamMutation.isPending || updateTeamMutation.isPending
              }
            >
              {teamToEdit
                ? updateTeamMutation.isPending
                  ? "Updating..."
                  : "Update Team"
                : createTeamMutation.isPending
                  ? "Creating..."
                  : "Create Team"}
            </Button>

          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
