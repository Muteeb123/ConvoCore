"use client";

import React, { useEffect, useState } from "react";
import ZoomLayout from "@/components/ZoomLayout";
import { useRoute } from "wouter";
import VideochatClientWrapper from "@/components/VideochatClientWrapper";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2"; // Assuming sidebarv-2 is correct
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { cn } from "@/lib/utils";

export default function InternalUserCallPage() {
  const [match, params] = useRoute("/call/users/:slug");
  const slug = params?.slug || "";
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("No meeting slug provided.");
      return;
    }
    const fetchToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/zoom-token?session=${encodeURIComponent(slug)}&role=participant`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error || `Failed to fetch token (${res.status})`
          );
        }
        const data = await res.json();
        setToken(data.token);
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [slug]);

  useEffect(() => {
    if (!slug || !token) return;
    let timer: number;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/meetings/${encodeURIComponent(slug)}/state`
        );
        if (res.ok) {
          const s = await res.json();
          if (s.ended) {
            window.location.href = "/zoom";
            return;
          }
        }
      } catch (err) {
        console.error("Failed to poll state:", err);
      }
      timer = window.setTimeout(poll, 2500);
    };
    poll();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [slug, token]);

  // Use a variable to determine the "approved" (in call) stage
  const isInCall = !loading && !error && !!token;

  // This is the new layout structure, matching GuestCallPage.tsx
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        <DashboardHeader
          userName="Video Meeting"
          subtitle={
            isInCall
              ? "Session in progress"
              : `Joining: ${decodeURIComponent(slug)}`
          }
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

        {/* Main content area uses conditional styling */}
        <main
          className={cn(
            "flex-1 overflow-y-auto w-full",
            isInCall
              ? "bg-black p-0" // In-call style
              : "p-6 flex items-center justify-center bg-slate-100" // Lobby style
          )}
        >
          {loading ? (
            // Loading state (centered)
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600">Joining meeting...</p>
            </div>
          ) : error || !token ? (
            // Error state (centered)
            <div className="flex-1 flex items-center justify-center">
              <Alert
                variant="destructive"
                className="max-w-md mx-auto bg-white"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error || "Unable to join meeting."}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            // In-call state (full content area)
            <VideochatClientWrapper slug={slug} JWT={token} isHost={false} />
          )}
        </main>
      </div>
    </div>
  );
}
