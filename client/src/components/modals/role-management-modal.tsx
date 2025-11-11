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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { insertRoleSchema, Role } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RoleFormData = z.infer<typeof insertRoleSchema>;

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: Role | null;
}
interface Permission {
  id: string;
  label: string;
  description?: string;
}
interface PermissionGroup {
  [key: string]: Permission[];
}

const PERMISSION_GROUPS: PermissionGroup = {
  "Lead Management": [
    {
      id: "view_leads",
      label: "View Leads",
      description: "View all Leads in the system",
    },
    {
      id: "create_leads",
      label: "Create Leads",
      description: "Add new leads to the system",
    },
    {
      id: "edit_leads",
      label: "Edit Leads",
      description: "Modify existing lead information",
    },
    {
      id: "delete_leads",
      label: "Delete Leads",
      description: "Remove leads from the system",
    },
    {
      id: "assign_leads",
      label: "Assign Leads",
      description: "Assign leads to team members",
    },
    {
      id: "qualify_leads",
      label: "Qualify Leads",
      description: "Mark leads as qualified or lost",
    },
  ],
  "RFP Management": [
    {
      id: "view_rsp",
      label: "View RFP",
      description: "View RFP in the system",
    },
    {
      id: "create_rsp",
      label: "Create RFP",
      description: "Add new RFP to the system",
    },
    {
      id: "edit_rsp",
      label: "Edit RFP",
      description: "Modify existing RFP information",
    },
    {
      id: "delete_rsp",
      label: "Delete RFP",
      description: "Remove RFP from the system",
    },
  ],
  "Customer Management": [
    {
      id: "view_customers",
      label: "View Customers",
      description: "Access to customer database",
    },
    {
      id: "create_customers",
      label: "Create Customers",
      description: "Add new customers",
    },
    {
      id: "edit_customers",
      label: "Edit Customers",
      description: "Modify customer information",
    },
    {
      id: "delete_customers",
      label: "Delete Customers",
      description: "Remove customers",
    },
  ],
  Opportunities: [
    {
      id: "view_opportunities",
      label: "View Opportunities",
      description: "Access to opportunities pipeline",
    },
    {
      id: "create_opportunities",
      label: "Add Bulk Opportunities",
      description: "Add bulk opportunities",
    },
    {
      id: "edit_opportunities",
      label: "Edit Opportunities",
      description: "Modify opportunity details",
    },
    {
      id: "delete_opportunities",
      label: "Delete Opportunities",
      description: "Remove opportunities",
    },
  ],
  // "Email Integration": [
  //   { id: "send_emails", label: "Send Emails", description: "Send emails through the system" },
  //   { id: "configure_email", label: "Configure Email Settings", description: "Setup email integrations" },
  //   { id: "see_emails", label: "View Emails", description: "See Emails in the Inbox" },
  // ],
  Tasks: [
    {
      id: "view_tasks",
      label: "View Tasks",
      description: "Access to task management",
    },
    {
      id: "create_tasks",
      label: "Create Tasks",
      description: "Create new tasks",
    },
    {
      id: "assign_tasks",
      label: "Assign Tasks",
      description: "Assign tasks to team members",
    },
    { id: "delete_tasks", label: "Delete Tasks", description: "Delete tasks" },
    { id: "edit_tasks", label: "Edit Tasks", description: "Edit tasks" },
    // { id: "view_calendar", label: "View Calendar", description: "Access to calendar and meetings" },
    // { id: "schedule_meetings", label: "Schedule Meetings", description: "Create and manage meetings" },
  ],
  // "Reports & Analytics": [
  //   { id: "view_reports", label: "View Reports", description: "Access to reports and analytics" },
  //   { id: "create_reports", label: "Create Custom Reports", description: "Build custom reports" },
  //   { id: "export_data", label: "Export Data", description: "Export system data" },
  //   { id: "view_analytics", label: "View Analytics", description: "Access to detailed analytics" },
  // ],
  "User Management": [
    {
      id: "view_users",
      label: "View Users",
      description: "Access to user management",
    },
    {
      id: "create_users",
      label: "Create Users",
      description: "Add new users to the system",
    },
    {
      id: "edit_users",
      label: "Edit Users",
      description: "Modify user information",
    },
    {
      id: "delete_users",
      label: "Delete Users",
      description: "Remove users from the system",
    },
    {
      id: "manage_roles",
      label: "Manage Roles",
      description: "Create and modify user roles",
    },
    {
      id: "delete_roles",
      label: "Delete Roles",
      description: "Remove roles from the system",
    },
  ],
  // "System Settings": [
  //   { id: "view_settings", label: "View Settings", description: "Access to system settings" },
  //   { id: "edit_settings", label: "Edit Settings", description: "Modify system configuration" },
  //   { id: "manage_integrations", label: "Manage Integrations", description: "Configure third-party integrations" },
  // ],
  "Contact Management": [
    {
      id: "view_contacts",
      label: "View Contacts",
      description: "Access to view all contact",
    },
    {
      id: "create_contacts",
      label: "Create Contacts",
      description: "Add new contacts",
    },
    {
      id: "edit_contacts",
      label: "Edit Contacts",
      description: "Modify contact information",
    },
    {
      id: "delete_contacts",
      label: "Delete Contacts",
      description: "Configure third-party integrations",
    },
  ],
  Dashboard: [
    { id: "view_dashboard_stats", label: "View Statistics" },
    { id: "view_recent_activities", label: "View Recent Activities" },
  ],
  "Team Management": [
    {
      id: "view_team",
      label: "View team",
      description: "View team in the system",
    },
    {
      id: "create_team",
      label: "Create team",
      description: "Add new team to the system",
    },
    {
      id: "edit_team",
      label: "Edit team",
      description: "Modify existing team information",
    },
    {
      id: "delete_team",
      label: "Delete team",
      description: "Remove team from the system",
    },
  ],

  Zoom: [
    {
      id: "Video_with_zoom_log",
      label: "Video Call Zoom",
      description: "Video Call with Zoom in the system",
    },
  ],
  Chatting: [
    {
      id: "Chat_with_whatsapp_log",
      label: "Chat Through Whatsapp",
      description: "Chat Through Whatsapp in the system",
    },
  ],
  Analytics: [
    {
      id: "view_analytics",
      label: "View Analytics",
      description: "View Analtyics in the system",
    },
  ],
  Logging: [
    {
      id: "view_log",
      label: "View Logging",
      description: "View Logs and Activity logs in the system",
    },
  ],
  // "Activity Logs": [
  //   {
  //     id: "view_activity_log",
  //     label: "View Activity Log",
  //     description: "View Activity Log in the system",
  //   },
  // ],
};

const GROUP_TO_PERMISSION_KEY: Record<string, string> = {
  Dashboard: "dashboard",
  "RSP Management": "rspmanagement", // Corrected key if needed
  "Lead Management": "leadmanagement",
  "Customer Management": "customermanagement",
  Opportunities: "opportunities",
  "Email Integration": "email",
  Tasks: "task",
  "Reports & Analytics": "report",
  "User Management": "usermanagement",
  "System Settings": "systemsettings",
  "Contact Management": "contacts",
  "Team Management": "teammanagement",
  Analytics: "analytics",
  Logging: "logging",
  // "Activity Logs": "activitylogs",
  Zoom: "zoom",
  Chatting: "chatting",
};

export function RoleManagementModal({
  isOpen,
  onClose,
  role,
}: RoleManagementModalProps) {
  const { toast } = useToast();
  const isEditing = !!role;

  const { data: existingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roles");
      return await res.json();
    },
    enabled: isOpen, // Only fetch when the modal is open
  });

  const form = useForm<RoleFormData>({
    resolver: zodResolver(insertRoleSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || [],
      roleType: role?.roleType || "none",
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        roleType: role.roleType,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        permissions: [],
        roleType: "none",
      });
    }
  }, [role, form, isOpen]); // Also reset on isOpen to clear form when re-opening for "create"

  const selectedPermissions = form.watch("permissions") || [];
  const roleType = form.watch("roleType") || "none";

  useEffect(() => {
    if (roleType === "associate") {
      const permissions = form.getValues("permissions") || [];
      if (!permissions.includes("view_team")) {
        form.setValue("permissions", [...permissions, "view_team"]);
      }
    }
  }, [roleType, form]);

  const filteredPermissionGroups: PermissionGroup =
    roleType === "none"
      ? {}
      : Object.fromEntries(
          Object.entries(PERMISSION_GROUPS)
            .map(([groupName, permissions]) => {
              let filteredPermissions = [...permissions];
              if (roleType === "associate") {
                filteredPermissions = filteredPermissions.filter(
                  (p) => !p.id.startsWith("delete_")
                );
                if (
                  ["User Management", "Team Management"].includes(groupName)
                ) {
                  filteredPermissions = [];
                }
              }
              return [groupName, filteredPermissions];
            })
            .filter(([_, perms]) => perms.length > 0)
        );

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      if (!data.name.trim()) {
        throw new Error("Role name is required");
      }
      if (
        existingRoles?.some(
          (r) => r.name.toLowerCase() === data.name.toLowerCase()
        )
      ) {
        throw new Error("A role with this name already exists");
      }
      if ((data.permissions ?? []).length === 0 && data.roleType !== "none") {
        // Allow no permissions if type is 'none'
        throw new Error(
          "At least one permission must be selected for this role type"
        );
      }
      const res = await apiRequest("POST", "/api/roles", data);
      if (!res.ok) {
        // Handle server-side errors
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to create role." }));
        throw new Error(errorData.message || "Failed to create role.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Role created",
        description: "The role has been successfully created.",
      });
      onClose(); // Close modal on success
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      if (!role?.id) throw new Error("Role ID is missing.");
      if (!data.name.trim()) {
        throw new Error("Role name is required");
      }
      if (
        existingRoles?.some(
          (r) =>
            r.id !== role.id && r.name.toLowerCase() === data.name.toLowerCase()
        )
      ) {
        throw new Error("A role with this name already exists");
      }
      if ((data.permissions ?? []).length === 0 && data.roleType !== "none") {
        throw new Error(
          "At least one permission must be selected for this role type"
        );
      }
      const res = await apiRequest("PUT", `/api/roles/${role.id}`, data);
      if (!res.ok) {
        // Handle server-side errors
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to update role." }));
        throw new Error(errorData.message || "Failed to update role.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({
        title: "Role updated",
        description: "The role has been successfully updated.",
      });
      onClose(); // Close modal on success
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: RoleFormData) => {
    // Logic for adding group permissions
    const groupPermissions: string[] = [];
    Object.entries(PERMISSION_GROUPS).forEach(([groupName, permissions]) => {
      // Use PERMISSION_GROUPS, not filtered
      const groupPermissionIds = permissions.map((p) => p.id);
      const anySelected = groupPermissionIds.some((id) =>
        (data.permissions ?? []).includes(id)
      );
      const groupKey = GROUP_TO_PERMISSION_KEY[groupName];

      if (groupKey) {
        if (anySelected && !data.permissions?.includes(groupKey)) {
          // Add group key if any child is selected
          groupPermissions.push(groupKey);
        }
        // Note: You might also need logic to *remove* the groupKey if no children are selected,
        // which handlePermissionChange and handleGroupToggle should manage.
      }
    });

    const permissionsArray = Array.isArray(data.permissions)
      ? data.permissions
      : [];
    const finalPermissions = Array.from(
      new Set([...permissionsArray, ...groupPermissions])
    );

    // Ensure 'view_team' is included for associates, even if group is hidden
    if (
      data.roleType === "associate" &&
      !finalPermissions.includes("view_team")
    ) {
      finalPermissions.push("view_team");
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          ...data,
          permissions: finalPermissions,
        });
      } else {
        await createMutation.mutateAsync({
          ...data,
          permissions: finalPermissions,
        });
      }
    } catch (e) {
      // Errors are handled by the mutation's onError
      console.error("Submit error (handled by mutation):", e);
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const currentPermissions = [...selectedPermissions];
    let groupName = "";
    let groupKey = "";
    for (const [name, permissions] of Object.entries(PERMISSION_GROUPS)) {
      // Use full list
      if (permissions.some((p) => p.id === permissionId)) {
        groupName = name;
        groupKey = GROUP_TO_PERMISSION_KEY[name];
        break;
      }
    }

    let newPermissions = [...currentPermissions];

    if (checked) {
      if (!newPermissions.includes(permissionId)) {
        newPermissions.push(permissionId);
      }
      if (groupName && groupKey && !newPermissions.includes(groupKey)) {
        newPermissions.push(groupKey);
      }
    } else {
      newPermissions = newPermissions.filter((p) => p !== permissionId);
      if (groupName && groupKey) {
        // Check if group key should be removed
        const groupPermissions = PERMISSION_GROUPS[groupName].map((p) => p.id);
        const hasOtherSelected = groupPermissions.some((id) =>
          newPermissions.includes(id)
        );
        if (!hasOtherSelected) {
          newPermissions = newPermissions.filter((p) => p !== groupKey);
        }
      }
    }
    form.setValue("permissions", newPermissions);
  };

  const handleGroupToggle = (
    groupPermissions: string[],
    groupKey: string,
    allSelected: boolean
  ) => {
    let currentPermissions = [...selectedPermissions];

    if (allSelected) {
      // Deselect all in this group + group key
      currentPermissions = currentPermissions.filter(
        (p) => !groupPermissions.includes(p) && p !== groupKey
      );
    } else {
      // Select all in this group + group key
      currentPermissions = Array.from(
        new Set([...currentPermissions, ...groupPermissions, groupKey])
      );
    }
    form.setValue("permissions", currentPermissions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* ✅ This is the correct structure for a modal. 
          max-h-[90vh] and overflow-y-auto handle scrolling.
      */}
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        {" "}
        {/* Added custom scrollbar class */}
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update role information and permissions."
              : "Create a new user role with specific permissions."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {" "}
            {/* Responsive */}
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                placeholder="Enter role name"
                {...form.register("name", {
                  required: "Role name is required",
                })}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleType">Role Type *</Label>
              <Select
                onValueChange={(value) => {
                  form.setValue("roleType", value);
                  // Clear permissions if changing to 'none'
                  if (value === "none") {
                    form.setValue("permissions", []);
                  }
                }}
                value={roleType} // Use watched value
              >
                <SelectTrigger id="roleType">
                  {" "}
                  {/* Added id */}
                  <SelectValue placeholder="Select role type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No Permissions)</SelectItem>
                  <SelectItem value="associate">Associate</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team-lead">Team Lead</SelectItem>
                  {/* <SelectItem value="admin">
                    Admin (All Permissions)
                  </SelectItem>{" "} */}
                  {/* Example: Add Admin */}
                </SelectContent>
              </Select>
              {form.formState.errors.roleType && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.roleType.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Enter role description"
              {...form.register("description")}
            />
          </div>

          {Object.keys(filteredPermissionGroups).length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              {" "}
              {/* Added separator */}
              <Label className="text-base font-semibold">
                Role Permissions *
              </Label>
              <p className="text-sm text-gray-600">
                Select the permissions this role should have access to.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(filteredPermissionGroups).map(
                  ([groupName, permissions]) => {
                    const groupPermissionIds = permissions.map((p) => p.id);
                    const groupKey = GROUP_TO_PERMISSION_KEY[groupName]; // Get the group's own permission key
                    const selectedInGroup = groupPermissionIds.filter((id) =>
                      selectedPermissions.includes(id)
                    );
                    const allSelected =
                      selectedInGroup.length > 0 &&
                      selectedInGroup.length === groupPermissionIds.length; // Ensure group is not empty
                    const someSelected =
                      selectedInGroup.length > 0 && !allSelected;

                    return (
                      <Card key={groupName}>
                        <CardHeader className="pb-3 pt-4 px-4">
                          {" "}
                          {/* Adjusted padding */}
                          <div className="flex items-center space-x-3">
                            {" "}
                            {/* Increased spacing */}
                            <Checkbox
                              id={`group-${groupName}`}
                              checked={allSelected}
                              // Use 'indeterminate' state visually when some are selected
                              onCheckedChange={() =>
                                handleGroupToggle(
                                  groupPermissionIds,
                                  groupKey,
                                  allSelected
                                )
                              }
                              aria-label={`Select all ${groupName} permissions`}
                              className={
                                someSelected
                                  ? "data-[state=checked]:bg-gray-400"
                                  : ""
                              } // Visual for indeterminate
                            />
                            <Label
                              htmlFor={`group-${groupName}`}
                              className="text-base font-medium cursor-pointer"
                            >
                              {" "}
                              {/* Larger font, cursor */}
                              {groupName}
                            </Label>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 px-4 pb-4 space-y-3">
                          {" "}
                          {/* Adjusted padding */}
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start space-x-3 pl-1"
                            >
                              {" "}
                              {/* Indent permissions */}
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.includes(
                                  permission.id
                                )}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    permission.id,
                                    checked as boolean
                                  )
                                }
                                aria-label={permission.label}
                                className="mt-1" // Align checkbox with first line
                              />
                              <div className="grid gap-0.5 leading-none">
                                {" "}
                                {/* Reduced gap */}
                                <Label
                                  htmlFor={permission.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer" // Added cursor
                                >
                                  {permission.label}
                                </Label>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
              {/* Selected Permissions Read-only View */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium mb-2">
                  Selected Permissions ({selectedPermissions.length})
                </h4>
                {form.formState.errors.permissions && (
                  <p className="text-sm text-red-600 mb-2">
                    {form.formState.errors.permissions.message}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {" "}
                  {/* Reduced gap */}
                  {selectedPermissions.length === 0 ? (
                    <span className="text-sm text-gray-500 italic">
                      No permissions selected
                    </span>
                  ) : (
                    // Show only *specific* permissions, not group keys
                    selectedPermissions
                      .filter(
                        (id) =>
                          !Object.values(GROUP_TO_PERMISSION_KEY).includes(id)
                      ) // Filter out group keys
                      .map((permissionId) => {
                        const permission = Object.values(PERMISSION_GROUPS) // Check all groups
                          .flat()
                          .find((p) => p.id === permissionId);
                        return (
                          <Badge
                            key={permissionId}
                            variant="secondary"
                            className="font-normal"
                          >
                            {permission?.label || permissionId}
                          </Badge>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 border-t">
            {" "}
            {/* Added separator */}
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
                ? "Update Role"
                : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add global styles if needed, or move to your global CSS file
// e.g., for custom scrollbar (if 'custom-scrollbar' class is defined globally)
/*
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
*/
