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
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
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
  Users,
  Mail, // Keep Mail if used in modals
  Eye,
  UserPlus, // Keep UserPlus if used in modals
  User,
  UserCog,
  UserCheck,
  Settings,
} from "lucide-react";
import { Team, teamMembers, TeamWithMembers } from "@shared/schema"; // Ensure imports are correct
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TeamViewModal } from "@/components/modals/view-team-modal";
import { TeamModal } from "@/components/modals/teams-modal";
import { RoleMembersModal } from "@/components/modals/view-team-user-modal";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { TableSkeleton } from "@/components/TableSkeleton";
import { AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";
export default function Teams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(
    null
  );
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null); // Keep if used by a modal not shown
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); // Keep if used by a modal not shown
  const fallbackUrl =FALLBACK_URL;

  const [selectedRole, setSelectedRole] = useState<
    "manager" | "associate" | "team-lead" | null
  >(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const { toast } = useToast();

  const [permissions, setPermissions] = useState({
    createTeam: false,
    editTeam: false,
    deleteTeam: false,
    viewTeam: false,
  });

  const userrole = useRoleStore((state) => state.role);

  useEffect(() => {
    const perms = userrole?.permissions || [];
    const hasAll = perms.includes("all"); // Check for 'all' permission

    if (user?.userType === "associate") {
      setPermissions({
        createTeam: false,
        editTeam: false,
        deleteTeam: false,
        viewTeam: hasAll || perms.includes("view_team"), // Allow if 'all' or 'view_team'
      });
    } else {
      setPermissions({
        createTeam: hasAll || perms.includes("create_team"),
        editTeam: hasAll || perms.includes("edit_team"),
        deleteTeam: hasAll || perms.includes("delete_team"),
        viewTeam: hasAll || perms.includes("view_team"),
      });
    }
  }, [userrole, user]); // Depend on both userrole and user

  const handleEditTeam = async (teamId: number) => {
    try {
      if (!teamId) {
        return;
      }
      const res = await apiRequest("GET", `/api/teams/${teamId}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      const teamWithMembers = await res.json();
      setSelectedTeam(teamWithMembers);
      setIsTeamModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load team details.",
        variant: "destructive",
      });
    }
  };

  const handleViewRoleMembers = (
    team: TeamWithMembers,
    role: "manager" | "associate" | "team-lead"
  ) => {
    setSelectedTeam(team);
    setSelectedRole(role);
    setIsRoleModalOpen(true);
  };

  // This function seems unused in the table, but we keep it
  const handleViewUser = async (userId: number) => {
    try {
      const res = await apiRequest("GET", `/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const user = await res.json();
      setSelectedUser(user);
      setIsUserModalOpen(true); // Ensure this modal exists and is imported if used
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user details.",
        variant: "destructive",
      });
    }
  };

  const {
    data: teams = [], // Default to empty array
    isLoading: teamsLoading,
    refetch: refetchTeams,
  } = useQuery<TeamWithMembers[]>({
    queryKey: ["myTeams", user?.id, user?.userType], // Add dependencies to queryKey
    queryFn: async () => {
      // User is checked in 'enabled', so it should exist here
      const res = await apiRequest(
        "GET",
        `/api/myTeams/${user!.id}?userType=${user!.userType}`
      );
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!user?.id && !!user?.userType,
  });

  // Refetch when user ID changes (e.g., on login)
  useEffect(() => {
    if (user?.id) {
      refetchTeams();
    }
  }, [user?.id, refetchTeams]); // Correct dependency

  // Note: This query fetches *all* users, which might be inefficient.
  // Consider if this is necessary or if member counts can come from the 'teams' query.
  const { data: users = [] } = useQuery<any[]>({
    // Assuming user type is complex
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/teams/${id}`);
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to delete team." }));
        throw new Error(errorData.message || "Failed to delete team.");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Invalidate users if team assignment changes
      toast({
        title: "Team deleted",
        description: "The team has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTeam = async (team: Team) => {
    toast({
      title: "Confirm Deletion",
      description: `Are you sure you want to delete the team "${team.name}"?`,
      action: (
        <div className="flex gap-2">
          {/* Using Shadcn Button for consistency */}
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              await deleteTeamMutation.mutateAsync(team.id);
            }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast({})} // Dismiss toast
          >
            Cancel
          </Button>
        </div>
      ),
    });
  };

  // This function might be redundant if `team.members` is available from the query
  const getMemberCount = (teamId: number) => {
    return users.filter((user: any) => user.teamId === teamId).length;
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // This function seems unused in the table
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  // --- Render Function ---
  const renderLoading = () => <TableSkeleton />;

  // --- Loading State ---
  if (teamsLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
          <DashboardHeader
            userName="Team Management"
            subtitle="Manage your teams and members"
            issearch={false}
          />
          {!isSidebarOpen && (
            <div className="absolute top-[65px] left-4 z-50 md:hidden ">
              <SidebarTrigger
                className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
                onClick={() => setSidebarOpen(true)}
              />
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-6 w-full flex items-center justify-center">
            {renderLoading()}
          </main>
        </div>
      </div>
    );
  }

  // --- Main Return ---
  return (
    // 1. Root container: Full screen, no browser scrolling
    <div className="flex h-screen w-full overflow-hidden">
      {/* 2. Sidebar: Fixed width, uses its own internal scrolling */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. Main Content Area: Fills remaining space, flex column */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* 4. Fixed Header: Stays at the top */}
        <DashboardHeader
          userName="Team Management"
          subtitle="Manage your teams and members"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden ">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    <div className="flex gap-2 items-center">
                      {" "}
                      {/* Centered icon */}
                      Teams
                      <Users className="w-6 h-6 text-gray-700" />
                    </div>
                  </CardTitle>
                  <CardDescription>Manage your teams here</CardDescription>
                </div>
                {permissions.createTeam && (
                  // <Button
                  //   className="bg-primary hover:bg-primary/90 h-9" // Added height
                  // onClick={() => {
                  //   setSelectedTeam(null);
                  //   setIsTeamModalOpen(true);
                  // }}
                  // >
                  //   <Plus className="w-4 h-4 mr-2" />
                  //   Create Team
                  // </Button>
                  <RoundedPrimaryButton
                    title="Create Team"
                    onClick={() => {
                      setSelectedTeam(null);
                      setIsTeamModalOpen(true);
                    }}
                    icon={<Plus className="w-4 h-4 mr-2" />}
                    iconAlt="Add"
                  />
                )}
              </div>
              <div className="flex items-center space-x-2 pt-4">
                {" "}
                {/* Added padding */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />{" "}
                  {/* Centered icon */}
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9" // Added height
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* We moved isLoading check to wrap the main content */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">
                        {" "}
                        {/* Adjusted width */}
                        <div className="flex gap-2 items-center">
                          <Users className="w-4 h-4 text-gray-600" />
                          Team
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex gap-2 items-center">
                          <User className="w-4 h-4 text-gray-600" />
                          Associates
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex gap-2 items-center">
                          <UserCog className="w-4 h-4 text-gray-600" />
                          Managers
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex gap-2 items-center">
                          <UserCheck className="w-4 h-4 text-gray-600" />
                          Team Leads
                        </div>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        {" "}
                        {/* Fixed width for actions */}
                        <div className="flex gap-2 items-center">
                          <Settings className="w-4 h-4 text-gray-600" />
                          Actions
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-gray-500">
                            {searchTerm
                              ? "No teams match your search."
                              : "No teams found."}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={team.avatar ? team.avatar : fallbackUrl} alt='avatar' className="w-full h-full object-cover" />
                              </Avatar>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {team.name}{" "}
                                  {/* Removed truncation, let table handle it */}
                                </div>
                                {team.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-xs">
                                    {" "}
                                    {/* Truncate description */}
                                    {team.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {/* Associates */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex justify-center items-center">
                                {team.members?.filter(
                                  (m) => m.user.userType === "associate"
                                ).length || 0}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon" // Use icon size
                                className="h-7 w-7" // Smaller button
                                onClick={() =>
                                  handleViewRoleMembers(team, "associate")
                                }
                              >
                                <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                            </div>
                          </TableCell>
                          {/* Managers */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 flex justify-center items-center">
                                {team.members?.filter(
                                  (m) => m.user.userType === "manager"
                                ).length || 0}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleViewRoleMembers(team, "manager")
                                }
                              >
                                <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                            </div>
                          </TableCell>
                          {/* Team Leads */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium w-6 h-6 rounded-full bg-green-100 text-green-800 flex justify-center items-center">
                                {team.members?.filter(
                                  (m) => m.user.userType === "team-lead"
                                ).length || 0}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleViewRoleMembers(team, "team-lead")
                                }
                              >
                                <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-0.5">
                              {" "}
                              {/* Reduced space */}
                              <Button
                                variant="ghost"
                                size="icon" // Use icon size
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedTeam(team);
                                  setIsViewTeamModalOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                              {permissions.editTeam && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    handleEditTeam(team.id);
                                  }}
                                >
                                  <Edit className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                                </Button>
                              )}
                              {permissions.deleteTeam && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteTeam(team)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
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
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modals */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={selectedTeam}
        permissions={permissions}
      />
      <TeamViewModal
        isOpen={isViewTeamModalOpen}
        onClose={() => setIsViewTeamModalOpen(false)}
        team={selectedTeam}
      />
      <RoleMembersModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        team={selectedTeam}
        role={selectedRole}
        permissions={permissions}
      />
      {/* Add user view/edit modal here if handleViewUser is used */}
      {/* <UserViewModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={selectedUser} /> */}
    </div>
  );
}
