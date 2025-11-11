"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
// import Sidebar from "@/components/layout/sidebarv-2"; // Assuming sidebarv-2 is correct
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { PartyPopper } from "lucide-react";
import GuestSidebar from "@/components/guestheader";

export default function GuestThanks() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="bg-[#001E40] flex-shrink-0">
        <GuestSidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        <DashboardHeader
          userName="Meeting Ended"
          subtitle="Thank you for your time"
          issearch={false}
        />

        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* This main content area centers the card, matching the Leads page layout */}
        <main className="flex-1 overflow-y-auto p-6 w-full flex items-center justify-center bg-slate-100">
          <Card className="max-w-md w-full text-center shadow-lg">
            <CardContent className="pt-8 space-y-4">
              {/* Improved SVG/Icon holder */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-50">
                <PartyPopper className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-800">
                  Thanks for joining!
                </h1>
                <p className="text-slate-600">
                  The meeting has ended. We appreciate your time and
                  participation.
                </p>
                <p className="text-sm text-slate-500 pt-4">
                  You can now safely close this window.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
