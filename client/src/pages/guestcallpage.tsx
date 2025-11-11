"use client";

import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import VideochatClientWrapper from "@/components/VideochatClientWrapper";
import { Loader2, AlertCircle, Video } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
// import Sidebar from "@/components/layout/sidebarv-2"; // Assuming sidebarv-2 is correct
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { cn } from "@/lib/utils";
import GuestSidebar from "@/components/guestheader";
export default function GuestCallPage() {
  const [match, params] = useRoute("/call/guest/:slug");
  const slug = params?.slug || "";
  const [approvalId, setApprovalId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [stage, setStage] = useState<
    "request" | "waiting" | "approved" | "ended"
  >("request");
  // Added state for the sidebar
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!slug) {
      setStage("ended");
      setError("Invalid meeting link.");
    } else {
      setStage("request");
      setToken("");
      setApprovalId("");
      setError("");
    }
  }, [slug]);

  useEffect(() => {
    if (!slug || !approvalId || stage !== "waiting") return;
    let timer: number;
    const poll = async () => {
      try {
        const endedRes = await fetch(
          `/api/meetings/${encodeURIComponent(slug)}/state`
        );
        if (endedRes.ok) {
          const s = await endedRes.json();
          if (s.ended) {
            window.location.href = "/guest-thanks";
            return;
          }
        }

        const res = await fetch(
          `/api/meetings/${encodeURIComponent(
            slug
          )}/approval?id=${encodeURIComponent(approvalId)}`
        );
        if (res.status === 410) {
          window.location.href = "/guest-thanks";
          return;
        }
        if (res.status === 200) {
          const data = await res.json();
          setToken(data.token);
          setStage("approved");
          setLoading(false);
          return;
        }
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      }
      timer = window.setTimeout(poll, 2000);
    };
    poll();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [slug, approvalId, stage]);

  const submitRequest = async () => {
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/meetings/${encodeURIComponent(slug)}/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || `Failed to request join (${res.status})`
        );
      }
      const data = await res.json();
      setApprovalId(data.id);
      setStage("waiting");
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // REMOVED: The separate "approved" return block.

  // All stages are now handled inside this single return statement
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
          userName="Guest Meeting"
          subtitle={
            stage === "approved"
              ? "Session in progress"
              : "Join a secure video session"
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

        {/* This main content area now conditionally changes its styling.
          - When in call (approved): It's black, no padding, and contains the video.
          - Before call (request/waiting): It's gray, has padding, and centers the card.
        */}
        <main
          className={cn(
            "flex-1 overflow-y-auto w-full",
            stage === "approved"
              ? "bg-black p-0" // In-call style
              : "p-6 flex items-center justify-center bg-slate-100" // Lobby style
          )}
        >
          {/* Conditional content based on stage */}

          {stage === "approved" && token ? (
            // "In Call" view
            <VideochatClientWrapper slug={slug} JWT={token} isHost={false} />
          ) : !match || stage === "ended" ? (
            // "Ended" or "Invalid" view
            <Alert variant="destructive" className="max-w-md bg-white">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error ||
                  "This meeting link is invalid or the meeting has ended."}
              </AlertDescription>
            </Alert>
          ) : stage === "request" ? (
            // "Request to Join" view
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  Join Meeting
                </CardTitle>
                <CardDescription>
                  Meeting:{" "}
                  <span className="font-medium text-slate-700">
                    {decodeURIComponent(slug)}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitRequest();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label htmlFor="guest-name" className="text-sm font-medium">
                      Your Name
                    </label>
                    <Input
                      id="guest-name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!name || loading}
                    className="w-full h-11"
                  >
                    {loading ? "Requesting..." : "Request to Join"}
                  </Button>
                </form>
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : stage === "waiting" ? (
            // "Waiting for Host" view
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  Join Meeting
                </CardTitle>
                <CardDescription>
                  Meeting:{" "}
                  <span className="font-medium text-slate-700">
                    {decodeURIComponent(slug)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  <div className="text-center">
                    <p className="font-semibold text-slate-800">
                      Waiting for host approval
                    </p>
                    <p className="text-sm text-slate-500">
                      The meeting host will admit you shortly
                    </p>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}
