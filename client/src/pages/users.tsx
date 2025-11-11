import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserCog,
  Mail,
  Eye,
  BadgeMinus,
  Bell,
  BellOff,
} from "lucide-react";
import { User, Role, TeamWithMembers } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RoleManagementModal } from "@/components/modals/role-management-modal";
import { UserModal } from "@/components/modals/user-model";
import { ViewUserModel } from "@/components/modals/view-user-model";
import { ToastClose } from "@/components/ui/toast";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { ViewRoleModel } from "@/components/modals/view-role-model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isViewUserModalOpen, setIsViewUserModalOpen] = useState(false);
  const [isViewRoleModelOpen, setIsViewRoleModelOpen] = useState(false);
  const [isAllowCreateUse, setAllowCreateUse] = useState(false);
  const [isAllowEditUse, setAllowEditUser] = useState(false);
  const [isAllowDeleteUse, setAllowDeleteUser] = useState(false);
  const [isAllowedMangaeRole, setisAllowedMangaeRole] = useState(false);
  const [isAllowedDeleteRole, setAllowedDeleteRole] = useState(false);
  const fallbackUrl = FALLBACK_URL;
  const [activeTab, setActiveTab] = useState<
    "associate" | "manager" | "team-lead" | "admin"
  >("associate");

  const activeUser = useUserStore((state) => state.user);
  const userrole = useRoleStore((state) => state.role);

  // --- Data Queries ---
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });
  const { data: Teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/team-with-members");
      return res.json();
    },
  });

  // --- Mutations ---
  const InActiveUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to deactivate user." }));
        throw new Error(errorData.message || "Failed to deactivate user.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User Deactivated",
        description: "The user has been successfully made inactive.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to make user inactive.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/roles?ids=${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          message: "Failed to delete role. Check associations.",
        }));
        throw new Error(errorData.message || "Failed to delete role.");
      }
      return true;
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Role[]>(["roles"], (oldRoles = []) =>
        oldRoles.filter((role) => role.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Invalidate users
      toast({
        title: "Role deleted",
        description: "The Role has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to delete Role. Users might be associated with this Role.",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: number;
      roleId: number;
    }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}`, { roleId });
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to update role." }));
        throw new Error(errorData.message || "Failed to update role.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User role updated",
        description: "The user's role has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // --- Effects ---
  useEffect(() => {
    const permissions = userrole?.permissions || [];
    const hasAll = permissions.includes("all");

    setAllowCreateUse(hasAll || permissions.includes("create_users"));
    setAllowEditUser(hasAll || permissions.includes("edit_users"));
    setAllowDeleteUser(hasAll || permissions.includes("delete_users"));
    setisAllowedMangaeRole(hasAll || permissions.includes("manage_roles"));
    setAllowedDeleteRole(hasAll || permissions.includes("delete_roles"));
  }, [userrole]);

  // --- Derived State & Helpers ---
  const filteredUsers = users.filter((user) => {
    const matchesUserType = user.userType === activeTab;
    const matchesSearch =
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUserType && matchesSearch;
  });

  const handleInActiveUser = async (id: number) => {
    if (id === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot deactivate your own account.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Confirm Deactivation",
      description: "Are you sure you want to make this user inactive?",
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            await InActiveUserMutation.mutateAsync(id);
          }}
        >
          Deactivate
        </Button>
      ),
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (role.name.toLowerCase() === "admin") {
      toast({
        title: "Error",
        description: "You cannot delete the Admin Role.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Confirm Deletion",
      description: `Are you sure you want to delete the role "${role.name}"?`,
      action: (
        <div className="flex gap-2">
          <Button // Use Shadcn Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await deleteRoleMutation.mutateAsync(role.id);
            }}
          >
            Delete
          </Button>
          <ToastClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </ToastClose>
        </div>
      ),
    });
  };

  // This handler seems unused, but kept
  const handleRoleChange = async (userId: number, roleId: number) => {
    await updateUserRoleMutation.mutateAsync({ userId, roleId });
  };

  const getRoleName = (roleId: number | null) => {
    if (!roleId) return "No Role";
    const role = roles.find((r) => r.id === roleId);
    return role?.name || "Unknown Role";
  };
  const getTeamNameForAssociate = (userId: number) => {
    if (!Teams || Teams.length === 0) return "—";

    const teamEntry = Teams.find((t: any) => t.userId === userId);
    return teamEntry?.team?.name || "—";
  };

  const getRoleColor = (roleId: number | null) => {
    if (!roleId) return "bg-gray-100 text-gray-800";
    const role = roles.find((r) => r.id === roleId);
    if (!role) return "bg-gray-100 text-gray-800";

    switch (role.name.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "team-lead":
        return "bg-green-100 text-green-800"; // Example
      case "associate":
        return "bg-purple-100 text-purple-800"; // Example
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return "??";
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const handleAddRole = () => {
    setSelectedRole(null);
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    if (role.name.toLowerCase() === "admin") {
      toast({
        title: "Error",
        description: "Admin role cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    setSelectedRole(role);
    setIsRoleModalOpen(true);
  };

  const isLoading = usersLoading || rolesLoading; // Combined loading state

  // --- Render Functions ---
  const renderLoading = () => (
    <div className="flex items-center justify-center p-8 h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  // --- Main Return ---
  return (
    // <div className="flex h-screen bg-gray-50">
    //   <Sidebar />
    //   <div className="flex-1 flex flex-col overflow-hidden">
    //     <Header title="User Management" subtitle="Manage users and their permissions" />
    //     <main className="flex-1 overflow-y-auto p-6">
    <div className="flex h-screen w-full overflow-hidden">
      {/* 2. Sidebar: Fixed width, uses its own internal scrolling */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. Main Content Area: Fills remaining space, flex column */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* 4. Fixed Header: Stays at the top */}
        <DashboardHeader
          userName="User Management"
          subtitle="Manage users and their permissions"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* ✅ 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {isLoading ? (
            renderLoading()
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column: User Tabs and Table */}
              <div className="lg:col-span-3">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(
                      value as "associate" | "manager" | "team-lead" | "admin"
                    )
                  }
                >
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    {" "}
                    {/* Grid for 4 tabs */}
                    <TabsTrigger value="associate">Associate</TabsTrigger>
                    <TabsTrigger value="team-lead">Team Lead</TabsTrigger>
                    <TabsTrigger value="manager">Manager</TabsTrigger>
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab}>
                    {/* Users Table */}
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>
                                {" "}
                                {activeTab === "associate" && "Associates"}
                                {activeTab === "team-lead" && "Team Leads"}
                                {activeTab === "manager" && "Managers"}
                                {activeTab === "admin" && "Admins"}
                              </CardTitle>
                              <CardDescription>
                                Manage user accounts and their access levels
                              </CardDescription>
                            </div>
                            {isAllowCreateUse && (
                              <Button
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => {
                                  setSelectedUser(null);
                                  setIsUserModalOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {activeTab === "associate" && "Add Associate"}
                                {activeTab === "team-lead" && "Add Team Lead"}
                                {activeTab === "manager" && "Add Manager"}
                                {activeTab === "admin" && "Add admin"}
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {usersLoading ? (
                            <div className="flex items-center justify-center p-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>
                                      {activeTab === "associate"
                                        ? "Team"
                                        : "Role"}
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notifications</TableHead>
                                    {/* <-- ADD THIS */}
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredUsers.length === 0 ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={5}
                                        className="text-center py-8"
                                      >
                                        <div className="text-gray-500">
                                          {searchTerm
                                            ? "No users match your search."
                                            : "No users found."}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    filteredUsers.map((user) => (
                                      <TableRow key={user.id}>
                                        <TableCell>
                                          <div className="flex items-center space-x-3">
                                            <Avatar className="w-8 h-8">
                                              <AvatarImage
                                                src={
                                                  user.avatar
                                                    ? user.avatar
                                                    : fallbackUrl
                                                }
                                                alt="avatar"
                                              />
                                            </Avatar>
                                            <div>
                                              <div className="font-medium text-gray-900">
                                                {user.firstName} {user.lastName}
                                                {user.id ===
                                                  currentUser?.id && (
                                                  <Badge
                                                    variant="outline"
                                                    className="ml-2"
                                                  >
                                                    You
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="text-sm text-gray-500 flex items-center">
                                                <Mail className="w-3 h-3 mr-1" />
                                                {user.email}
                                              </div>
                                            </div>
                                          </div>
                                        </TableCell>

                                        <TableCell>
                                          {activeTab === "associate" ? (
                                            <Badge className="bg-gray-100 text-gray-800">
                                              {getTeamNameForAssociate(user.id)}
                                            </Badge>
                                          ) : (
                                            <Badge
                                              className={getRoleColor(
                                                user.roleId
                                              )}
                                            >
                                              {getRoleName(user.roleId)}
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              user.isActive
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {user.isActive
                                              ? "Active"
                                              : "Inactive"}
                                          </Badge>
                                        </TableCell>

                                        {/* --- THIS IS THE UPDATED CELL --- */}
                                        <TableCell>
                                          {/* Checks if 'isEmailNotification' is true. 
                          The '?? true' part means if the value is null or undefined, 
                          it will default to 'true' (showing the green bell).
                        */}
                                          {user.isEmailNotification ?? true ? (
                                            <Bell className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <BellOff className="w-4 h-4 text-red-600" />
                                          )}
                                        </TableCell>
                                        {/* ------------------------------- */}
                                        {/* --------------------------- */}

                                        {/* This is your "Actions" cell */}
                                        <TableCell>
                                          <div className="flex items-center space-x-2">
                                            {/* ... your buttons ... */}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center space-x-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedUser(user);
                                                setIsViewUserModalOpen(true);
                                              }}
                                            >
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                            {isAllowEditUse && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                  user?.rolename === "admin"
                                                }
                                                onClick={() => {
                                                  setSelectedUser(user);
                                                  setIsUserModalOpen(true);
                                                }}
                                              >
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                            )}
                                            {/* {isAllowDeleteUse && <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleInActiveUser(user.id)}
                                              className="text-red-600 hover:text-red-700"
                                              disabled={user.id === currentUser?.id || user?.rolename === 'admin'}
                                            >
                                              <BadgeMinus className="w-4 h-4" />
                                            </Button>} */}
                                            {isAllowDeleteUse && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleInActiveUser(user.id)
                                                }
                                                disabled={
                                                  user.id === currentUser?.id ||
                                                  user?.rolename === "admin" ||
                                                  !user.isActive // 👈 disable if already inactive
                                                }
                                                className={`${
                                                  !user.isActive
                                                    ? "opacity-40 cursor-not-allowed" // 👈 dim + block click
                                                    : "text-red-600 hover:text-red-700"
                                                }`}
                                              >
                                                <BadgeMinus className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column: Roles and Stats */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>User Roles</CardTitle>
                        <CardDescription>
                          Manage role permissions
                        </CardDescription>
                      </div>
                      {isAllowedMangaeRole && (
                        <Button
                          onClick={handleAddRole}
                          size="sm"
                          variant="outline"
                          className="h-9"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Role
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Note: rolesLoading check is fine here as it's a separate card */}
                    {rolesLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : roles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No roles configured
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {roles.map((role) => {
                          const userCount = users.filter(
                            (u) => u.roleId === role.id
                          ).length;

                          return (
                            <div
                              key={role.id}
                              className="border rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <Eye
                                      className="w-4 h-4 text-black-400 cursor-pointer"
                                      onClick={() => {
                                        setSelectedRole(role);
                                        setIsViewRoleModelOpen(true);
                                      }}
                                    />
                                    <h4 className="font-medium text-gray-900">
                                      {role.name}
                                    </h4>
                                  </div>
                                  {role.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {role.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className="text-xs text-gray-500">
                                      {userCount} user
                                      {userCount !== 1 ? "s" : ""}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {role.permissions?.length || 0}{" "}
                                      permissions
                                    </span>
                                  </div>
                                </div>
                                {isAllowedMangaeRole && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={
                                      role.name.toLowerCase() === "admin"
                                    }
                                    className={
                                      role.name.toLowerCase() === "admin"
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }
                                    onClick={() => handleEditRole(role)}
                                  >
                                    <UserCog className="w-4 h-4" />
                                  </Button>
                                )}
                                {isAllowedDeleteRole && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteRole(role)}
                                    disabled={
                                      role.name.toLowerCase() === "admin"
                                    }
                                    className={`text-red-600 hover:text-red-700${
                                      role.name.toLowerCase() === "admin"
                                        ? " opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-gray-600">
                          Total Users
                        </span>
                        <span className="font-medium">{users.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t">
                        <span className="text-sm text-gray-600">
                          Active Users
                        </span>
                        <span className="font-medium">
                          {users.filter((u) => u.isActive).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t">
                        <span className="text-sm text-gray-600">
                          Inactive Users
                        </span>
                        <span className="font-medium">
                          {users.filter((u) => !u.isActive).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t">
                        <span className="text-sm text-gray-600">
                          Total Roles
                        </span>
                        <span className="font-medium">{roles.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t">
                        <span className="text-sm text-gray-600">Admins</span>
                        <span className="font-medium">
                          {
                            users.filter(
                              (u) =>
                                getRoleName(u.roleId).toLowerCase() === "admin"
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Modals */}
      <RoleManagementModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        role={selectedRole}
      />
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        userType={activeTab}
      />
      <ViewUserModel
        isOpen={isViewUserModalOpen}
        onClose={() => setIsViewUserModalOpen(false)}
        Selecteduser={selectedUser}
      />
      <ViewRoleModel
        isOpen={isViewRoleModelOpen}
        onClose={() => setIsViewRoleModelOpen(false)}
        Selectedrole={selectedRole}
      />
    </div>
  );
}
