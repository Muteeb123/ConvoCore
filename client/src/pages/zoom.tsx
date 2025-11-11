"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { Copy, Video, Users, Link2, Shield, Calendar, UserCheck, Zap } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";

export default function IntegritiZoom() {
  const [sessionName, setSessionName] = useState("");
  const [, setLocation] = useLocation();
  const [copiedType, setCopiedType] = useState<"internal" | "external" | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const baseUrl = useMemo(() => window.location.origin, []);
  const internalLink = sessionName ? `${baseUrl}/call/users/${encodeURIComponent(sessionName)}` : "";
  const externalLink = sessionName ? `${baseUrl}/call/guest/${encodeURIComponent(sessionName)}` : "";

  const copy = async (text: string, type: "internal" | "external") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {}
  };

  return (
<div className="flex min-h-screen w-full">
<div className="bg-[#001E40] flex-shrink-0">
  <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
</div>
<div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
  <DashboardHeader
    userName="Zoom Meetings"
    subtitle="Launch, share, and track video meetings directly within Integriti CRM."
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
  <main className="flex-1 overflow-y-auto p-6 w-full">
    <section className="p-8 space-y-6">

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Meeting Session
          </label>
          <Input
            type="text"
            placeholder="e.g., Client Review, Sprint Planning..."
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="h-12 text-base border-slate-300/60 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 rounded-xl"
          />
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            Use a clear meeting name for CRM logging and reports
          </p>
        </div>
        <div>
          <Button
            disabled={!sessionName}
            onClick={() => setLocation(`/call/host/${sessionName}`)}
            className="w-full h-12 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-medium text-base rounded-xl transition-all disabled:opacity-40"
          >
            <Video className="w-5 h-5 mr-2" />
            Launch Meeting Room
          </Button>
        </div>

        {sessionName && (
          <div className="border-t border-slate-200/70 pt-6 space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              Share Meeting Links
            </h3>

            <div className="bg-slate-50 rounded-xl border border-slate-200/70 p-4 flex flex-col gap-3 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Team Link</p>
                  <p className="text-xs text-slate-500">Internal team access</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={internalLink}
                  className="flex-1 text-sm border-slate-300/40 bg-white font-mono rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(internalLink, "internal")}
                  className={`rounded-lg transition-all ${
                    copiedType === "internal"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* External Link */}
            <div className="bg-indigo-50/40 rounded-xl border border-indigo-200/70 p-4 flex flex-col gap-3 hover:border-indigo-300 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Client Link</p>
                  <p className="text-xs text-slate-500">External participant access</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={externalLink}
                  className="flex-1 text-sm border-blue-200/60 bg-white font-mono rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(externalLink, "external")}
                  className={`rounded-lg transition-all ${
                    copiedType === "external"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 flex items-center gap-1">
        <Shield className="w-3 h-3 text-green-500" />
        All meetings are encrypted and logged in Integriti CRM automatically.
      </p>
    </section>
    </main>
      </div>
    </div>
  );
}
