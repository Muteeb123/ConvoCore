"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  ChartLine,
  Target,
  Trophy,
  Users,
  BookOpen,
  Calendar,
  CheckSquare,
  BarChart3,
  Settings,
  Users2,
  UserCog,
  LogOut,
  ScrollText
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Rizwan Iqbal",
    title: "Team Lead BD",
    avatar: "/assets/Ellipse 459.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: ChartLine,
      isActive: true,
    },
    {
      title: "Leads",
      url: "#",
      icon: Target,
    },
    {
      title: "Opportunities",
      url: "#",
      icon: Trophy,
    },
    {
      title: "Customers",
      url: "#",
      icon: Users,
    },
    {
      title: "Tasks",
      url: "#",
      icon: CheckSquare,
    },
    {
      title: "Calendar",
      url: "#",
      icon: Calendar  ,
    },
  ],
  navSecondary: [
    {
      title: "Setting",
      url: "#",
      icon: Settings,
    },
    {
      title: "User Management",
      url: "#",
      icon: UserCog,
    },
    {
      title: "Teams",
      url: "#",
      icon: Users2,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div
          className="w-[208px] h-[44px] ml-[15px] gap-[8px] pt-[23px] pb-[25px] "
          style={{
            transform: "rotate(0deg)",
          }}
        >
          <Image
            src="/client/public/assets/Logo.png"
            alt="Sidebar Image"
            width={162}
            height={47}
            className="opacity-100"
            style={{
              transform: "rotate(0deg)",
            }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
