import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useBadgeStore } from "@/stores/useBadgeStore";
import { useQuery } from "@tanstack/react-query";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import {
  ChartLine,
  Target,
  Trophy,
  Users,
  BookOpen,
  Mail,
  Calendar,
  CheckSquare,
  BarChart3,
  Settings,
  Users2,
  UserCog,
  LogOut,
  ScrollText,
  MessageCircle
} from "lucide-react";
import { useEffect } from "react";

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: string;
}

const allNavigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: ChartLine, permissionKey: "dashboard" },
  { path: "/leads", label: "Leads", icon: Target, permissionKey: "leadmanagement" },
  { path: "/opportunities", label: "Opportunities", icon: Trophy, permissionKey: "opportunities" },
  { path: "/customers", label: "Customers", icon: Users, permissionKey: "customermanagement" },
  { path: "/contacts", label: "Contacts", icon: BookOpen, permissionKey: "contacts" },
  { path: "/tasks", label: "Tasks", icon: CheckSquare, permissionKey: "task" },
  { path: "/logs", label: "Logs", icon: ScrollText, permissionKey: "all" },
  { path: "/activitylogs", label: "Activity Logs", icon: ScrollText, permissionKey: "all" },
  // { path: "/emails", label: "Emails", icon: Mail, permissionKey: "email" },
  { path: "/calendar", label: "Calendar", icon: Calendar, permissionKey: "calendar" },
  // { path: "/chat", label: "Messages", icon: BarChart3, permissionKey: "all" },
  // { path: "/reports", label: "Reports & Analytics", icon: BarChart3, permissionKey: "report" },
];

const settingsItems = [
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/users", label: "User Management", icon: UserCog, permissionKey: "usermanagement" },
  { path: "/teams", label: "Teams", icon: Users2, permissionKey: "teammanagement" },
  { path: "/chatpage", label: "Chat", icon: MessageCircle, permissionKey: "teammanagement" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { badges } = useBadgeStore();
  const setRole = useRoleStore((state) => state.setRole);
  const activeuser = useUserStore((state) => state.user);

  const { data: role, refetch: refetchRole } = useQuery({
    queryKey: ["role", user?.roleId],
    queryFn: async () => {
      const res = await fetch(`/api/role/${user?.roleId}`);
      if (!res.ok) throw new Error("Failed to fetch role");
      return res.json();
    },
    enabled: !!user?.roleId,
  });

  useEffect(() => {
    if (role) setRole(role);
  }, [role, setRole]);

  useEffect(() => {
    if (role) {
      setRole(role); // update the store whenever role changes
    }
  }, [role?.permissions?.join(","), role, setRole]);



  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const getFilteredNavigationItems = () => {
    if (!role?.permissions) return [allNavigationItems[0]];

    const otherItems = role.permissions.includes("all")
      ? allNavigationItems.slice(1)
      : allNavigationItems.slice(1).filter(item =>
        role.permissions.includes(item.permissionKey)
      );

    return [allNavigationItems[0], ...otherItems];
  };

  const getFilteredSettingsItems = () => {
    if (!role?.permissions) return [];

    if (role.permissions.includes("all")) {
      return settingsItems;
    }

    return [
      settingsItems[0],
      ...settingsItems.slice(1).filter(item =>
        role.permissions.includes(item.permissionKey)
      ),
    ];
  };

  const filteredNavigationItems = getFilteredNavigationItems();
  const filteredSettingsItems = getFilteredSettingsItems();

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          {/* <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChartLine className="w-5 h-5 text-white" />
          </div> */}
          <span className="ml-3 text-xl font-bold text-gray-900">Integriti CRM</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          const badgeValue = badges[item.label.toLowerCase()];

          return (
            <Link key={item.path} href={item.path}>
              <a className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-50 text-primary border-r-2 border-primary' : ''
                }`}>
                <Icon className="w-5 h-5 mr-3" />
                <span className="flex-1">{item.label}</span>
                {/* {badgeValue && (
                  <Badge variant={item.label === "Leads" ? "destructive" : "secondary"} className="text-xs">
                    {badgeValue}
                  </Badge>
                )} */}
              </a>
            </Link>
          );
        })}

        {filteredSettingsItems.length > 0 && (
          <div className="border-t pt-4 mt-4">
            {filteredSettingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;

              return (
                <Link key={item.path} href={item.path}>
                  <a className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-50 text-primary border-r-2 border-primary' : ''
                    }`}>
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gray-300 text-gray-600">
              {getInitials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{role?.name || "User"}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}