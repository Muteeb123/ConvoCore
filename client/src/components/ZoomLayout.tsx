"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/sidebarv-2";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ZoomLayout({
  children,
  headerTitle,
  headerSubtitle,
}: {
  children: React.ReactNode;
  headerTitle: string;
  headerSubtitle?: string;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      {!isSidebarOpen && (
        <div className="absolute top-[65px] left-4 z-50 md:hidden">
          <SidebarTrigger
            className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
            onClick={() => setSidebarOpen(true)}
          />
        </div>
      )}

      {/* consistent scrolling container used by all pages */}
      <main className="flex-1 overflow-y-auto p-6 w-full bg-slate-50/50">
        {children}
      </main>
    </div>
  );
}
