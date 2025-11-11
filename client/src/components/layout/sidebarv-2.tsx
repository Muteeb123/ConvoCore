import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  X,
  ChartLine,
  Target,
  Trophy,
  Users,
  BookOpen,
  CheckSquare,
  ScrollText,
  Calendar,
  Settings,
  UserCog,
  Users2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  FileVideo, // Corrected icon name
} from "lucide-react";
// import { FileVideoCamera } from "lucide-react"; // FileVideoCamera might not exist, using FileVideo
import { useRoleStore } from "@/stores/useRoleStore";
import { useQuery } from "@tanstack/react-query";
import SidebarSkeleton from "../SidebarSkeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Import AvatarFallback
import { FALLBACK_URL } from "@/constants/data";

// --- Types and Navigation Arrays ---

type TopNavigationItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: string;
};
type NavLink = {
  path: string;
  label: string;
  icon?: any;
  permissionKey?: string;
};
type SettingsNavigationItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: string;
  path?: string;
  subItems?: NavLink[];
};
const allNavigationItems: TopNavigationItem[] = [
  {
    path: "/newDashboard",
    label: "Dashboard",
    icon: ChartLine,
    permissionKey: "dashboard",
  },
  {
    path: "/leads",
    label: "Leads",
    icon: Target,
    permissionKey: "leadmanagement",
  },
  {
    path: "/opportunities",
    label: "Opportunities",
    icon: Trophy,
    permissionKey: "opportunities",
  },
  {
    path: "/customers",
    label: "Customers",
    icon: Users,
    permissionKey: "customermanagement",
  },
  {
    path: "/contacts",
    label: "Contacts",
    icon: BookOpen,
    permissionKey: "contacts",
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: ChartLine,
    permissionKey: "analytics",
  },
  { path: "/tasks", label: "Tasks", icon: CheckSquare, permissionKey: "task" },
  {
    path: "/calendar",
    label: "Calendar",
    icon: Calendar,
    permissionKey: "calendar",
  },
  // Add more items here if needed to make it scroll
];
const settingsItems: SettingsNavigationItem[] = [
  // {
  //   path: "/zoom",
  //   label: "Zoom Call",
  //   icon: FileVideo, // Changed to FileVideo
  //   permissionKey: "zoom",
  // },
  // {
  //   path: "/chatpage",
  //   label: "Whatsapp",
  //   icon: MessageCircle,
  //   permissionKey: "chatting",
  // },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    permissionKey: "settings", // This key will be explicitly checked
  },
  {
    path: "/users",
    label: "User Management",
    icon: UserCog,
    permissionKey: "usermanagement",
  },
  {
    path: "/teams",
    label: "Teams",
    icon: Users2,
    permissionKey: "teammanagement",
  },

  // Your previous sidebar logic
  {
    label: "Logs",
    icon: ScrollText,
    permissionKey: "logging", // This was the PARENT group
    subItems: [
      { path: "/logs", label: "Logs", permissionKey: "logging" },
      {
        path: "/activitylogs",
        label: "Activity Logs",
        permissionKey: "logging",
      },
    ],
  },
];

// --- Sidebar Component ---

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [location] = useLocation();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const { user, logoutMutation } = useAuth();
  const setRole = useRoleStore((state) => state.setRole);
  const fallbackUrl = FALLBACK_URL;

  const { data: role, isLoading: roleIsLoading } = useQuery({
    // Renamed isLoading
    queryKey: ["role", user?.roleId],
    queryFn: async () => {
      const res = await fetch(`/api/role/${user?.roleId}`);
      if (!res.ok) throw new Error("Failed to fetch role");
      return res.json();
    },
    // ✅ This query will only run if roleId exists (i.e., NOT for associates)
    enabled: !!user?.roleId,
  });

  useEffect(() => {
    if (role) setRole(role);
  }, [role, setRole]);

  const handleLogout = () => {
    onClose();
    setIsProfileOpen(false);
    logoutMutation.mutate();
  };

  // ✅ --- UPDATED LOADING LOGIC ---
  // We are loading if:
  // 1. The main auth 'user' object isn't loaded yet.
  // 2. The user *has* a roleId, but the 'role' query hasn't finished yet.
  //    (Associates with user.roleId = null will skip this and load instantly)
  const isLoading = !user || (!!user?.roleId && roleIsLoading);

  if (isLoading) {
    return <SidebarSkeleton />;
  }
  // --- END UPDATED LOADING LOGIC ---

  // ✅ --- UPDATED PERMISSION LOGIC ---
  const getFilteredNavigationItems = () => {
    // For associates (no role), just show dashboard
    if (!role?.permissions) {
      return allNavigationItems.filter(
        (item) => item.path === "/newDashboard" || item.permissionKey === "all" // Also show any other 'all' items
      );
    }

    // For users with roles
    const userPermissions = (role.permissions as string[]) || [];
    const hasAll = userPermissions.includes("all");

    return allNavigationItems.filter((item) => {
      if (item.path === "/newDashboard") return true; // Always show Dashboard
      if (hasAll) return true;
      return userPermissions.includes(item.permissionKey);
    });
  };

  const getFilteredSettingsItems = () => {
    // Associates get 'all' and 'settings'
    if (user?.userType === "associate") {
      return settingsItems.filter(
        (item) => item.permissionKey === "all" || item.path === "/settings" // ✅ Explicitly show Settings by path
      );
    }

    // If user has a role, but role is still loading, return empty.
    if (!role?.permissions) return [];

    const userPermissions = (role.permissions as string[]) || [];
    const hasAll = userPermissions.includes("all");

    if (hasAll) return settingsItems;

    // Filter for everyone else
    return settingsItems.filter((item) => {
      // ✅ Always show Settings
      if (item.path === "/settings") return true;
      // Check 'all' permission key
      if (item.permissionKey === "all") return true;
      // Check specific permission
      return userPermissions.includes(item.permissionKey);
    });
  };
  // --- END UPDATED PERMISSION LOGIC ---

  const filteredNavigationItems = getFilteredNavigationItems();
  const filteredSettingsItems = getFilteredSettingsItems();

  const SidebarNavItem: React.FC<{ item: SettingsNavigationItem }> = ({
    item,
  }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [location] = useLocation();
    const hoverTimer = useRef<NodeJS.Timeout | null>(null);
    const isSubActive = item.subItems?.some((sub) => location === sub.path);
    const isActive = location === item.path || isSubActive;

    const handleMouseEnter = () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setIsHovered(true);
    };
    const handleMouseLeave = () => {
      hoverTimer.current = setTimeout(() => setIsHovered(false), 200);
    };

    if (item.subItems) {
      return (
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div
            className={`flex items-center justify-between gap-3 px-4 py-2 rounded-[64px] cursor-pointer transition-all ${
              isActive && !isHovered
                ? "bg-[#193453] text-white"
                : "text-[#FFFFFF80] hover:text-white hover:bg-[#0B4A8E]/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-[18px] h-[18px]" />
              <span className="text-[14px] font-[400]">{item.label}</span>
            </div>
            <div className="transition-transform duration-300">
              {isHovered ? (
                <ChevronUp className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              )}
            </div>
          </div>
          <div
            className={`mt-1 pl-6 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
              isHovered ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            {item.subItems.map((subItem) => (
              <Link
                href={subItem.path}
                key={subItem.path}
                onClick={() => {
                  setIsHovered(false);
                  onClose();
                }}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-[64px] transition-all ${
                  location === subItem.path
                    ? "text-white bg-[#193453]"
                    : "text-[#FFFFFF80] hover:text-white hover:bg-[#0B4A8E]/30"
                }`}
              >
                <span className="w-[18px] h-[18px]"></span>
                {subItem.label}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return (
      <Link
        href={item.path || "#"}
        key={item.label}
        onClick={() => onClose()}
        className={`flex items-center gap-3 px-4 py-2 rounded-[64px] cursor-pointer transition-all ${
          isActive
            ? "bg-[#193453] text-white"
            : "text-[#FFFFFF80] hover:text-white hover:bg-[#0B4A8E]/30"
        }`}
      >
        <item.icon className="w-[18px] h-[18px]" />
        <span className="text-[14px] font-[400]">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* MAIN SIDEBAR CONTAINER */}
      <aside
        className={`h-screen w-[240px] flex flex-col bg-[#001E40] text-white fixed md:relative z-50 transform transition-transform duration-300
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      md:translate-x-0`}
      >
        {/* Mobile close button */}
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={onClose} className="text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Header / Logo (Fixed Top) */}
        <div className="flex items-center justify-center pt-8 pb-6 border-b border-[#ffffff1a] flex-shrink-0">
          <img
            src="https://storage.googleapis.com/crmlogs/crm_assets/Logo.png"
            alt="Integriti Logo"
            className="w-[160px] h-auto mr-[27px]"
          />
        </div>

        {/* 2. Scrollable navigation area */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0 
                     scrollbar-width-none [&::-webkit-scrollbar]:hidden"
        >
          {/* Navigation section */}
          <nav className="space-y-2">
            {filteredNavigationItems.map((item) => (
              <Link
                href={item.path}
                key={item.label}
                onClick={() => onClose()}
                className={`flex items-center gap-3 px-4 py-3 rounded-[64px] cursor-pointer transition-all ${
                  location === item.path
                    ? "bg-[#193453] text-white"
                    : "text-[#FFFFFF80] hover:text-white hover:bg-[#0B4A8E]/30"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[15px] font-[400]">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Settings Section (inside scrollable area) */}
          <div className="space-y-2 pt-4 border-t border-[#ffffff1a]">
            {filteredSettingsItems.map((item) => (
              <SidebarNavItem item={item} key={item.label} />
            ))}
          </div>
        </div>

        {/* 3. Fixed Profile Section (Fixed Bottom) */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-[#ffffff1a]">
          <div className="relative">
            {isProfileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 w-full bg-[#001E40] rounded-lg shadow-lg py-1 z-10">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-[#FFFFFF] hover:bg-[#0B4A8E]/30 hover:rounded-lg"
                  disabled={logoutMutation.isPending}
                >
                  Logout
                </button>
              </div>
            )}

            {/* Profile bar */}
            <div
              className="flex items-center gap-2 bg-transparent px-2 py-1.5 rounded-xl cursor-pointer"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              {/* Profile image */}
              <Avatar className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <AvatarImage
                  src={user?.avatar ? user.avatar : fallbackUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
                <AvatarFallback className="bg-gray-500 text-white text-xs">
                  {user?.firstName ? user.firstName[0] : ""}
                  {user?.lastName ? user.lastName[0] : ""}
                </AvatarFallback>
              </Avatar>

              {/* Name + Role */}
              <div className="flex flex-col leading-tight min-w-0">
                {" "}
                {/* Added min-w-0 */}
                <span className="text-[13px] font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                {/* ✅ UPDATED: Show userType if roleType isn't available */}
                <span className="text-[11px] text-gray-400 capitalize truncate">
                  {role?.roleType || user?.userType || "Unknown Role"}
                </span>
              </div>

              {/* Chevron */}
              <span className="ml-auto text-gray-400 text-xs transition-transform flex-shrink-0">
                {isProfileOpen ? "⌃" : "⌄"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
