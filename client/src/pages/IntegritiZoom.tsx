// paste into your IntegritiZoom page (replace the component body)
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Copy,
  Video,
  Users,
  Link2,
  Shield,
  Calendar,
  UserCheck,
  Zap,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
import ZoomLayout from "@/components/ZoomLayout"; // your layout component

const safeOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

export default function IntegritiZoom() {
  const [sessionName, setSessionName] = useState("");
  const [, setLocation] = useLocation();
  const [copiedType, setCopiedType] = useState<"internal" | "external" | null>(
    null
  );
  const baseUrl = useMemo(() => safeOrigin(), []);
  const internalLink = sessionName
    ? `${baseUrl}/call/users/${encodeURIComponent(sessionName)}`
    : "";
  const externalLink = sessionName
    ? `${baseUrl}/call/guest/${encodeURIComponent(sessionName)}`
    : "";

  // ref for the action area (buttons + share links)
  const actionRef = useRef<HTMLDivElement | null>(null);

  // When user types a session name, scroll the action area into view.
  useEffect(() => {
    if (!sessionName) return;
    // small timeout ensures layout settled (safe)
    const t = window.setTimeout(() => {
      actionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [sessionName]);

  const copy = async (text: string, type: "internal" | "external") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <ZoomLayout
      headerTitle="Video Meetings"
      headerSubtitle="Launch, share & track video meetings"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              How it works
            </h3>
            <p className="text-sm text-blue-700">
              Create a meeting session, launch as host, and share links with
              your team or clients. All meetings are encrypted and logged in
              CRM.
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Video className="w-5 h-5 text-blue-600" />
              Create New Meeting
            </CardTitle>
            <CardDescription>
              Start a new video conference session
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="session-name"
                className="text-sm font-semibold text-slate-700 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                Meeting Session Name
              </label>

              <Input
                id="session-name"
                type="text"
                placeholder="e.g., Client Review, Sprint Planning..."
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="h-12 text-base rounded-lg"
                autoFocus
              />

              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                Use a clear meeting name for CRM logging and reports
              </p>
            </div>

            {/* ---------- ACTION AREA: sticky + has ref ---------- */}
            <div
              ref={actionRef}
              // sticky keeps this area visible below the header when you scroll
              className="sticky top-[78px] z-30 bg-slate-50/80 backdrop-blur-sm p-3 rounded-md shadow-sm sm:shadow-none"
            >
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <RoundedPrimaryButton
                  title="Launch Meeting Room"
                  onClick={() =>
                    setLocation(`/call/host/${encodeURIComponent(sessionName)}`)
                  }
                  icon={<Video className="w-5 h-5 mr-2" />}
                  iconAlt="Launch"
                  disabled={!sessionName}
                />

                <Button
                  onClick={() =>
                    setLocation(
                      `/call/users/${encodeURIComponent(sessionName)}`
                    )
                  }
                  disabled={!sessionName}
                  className="w-full sm:w-auto h-11"
                >
                  Join as Team Member
                </Button>

                <Button
                  onClick={() =>
                    setLocation(
                      `/call/guest/${encodeURIComponent(sessionName)}`
                    )
                  }
                  disabled={!sessionName}
                  variant="ghost"
                  className="w-full sm:w-auto h-11"
                >
                  Open Guest Link
                </Button>
              </div>
            </div>

            {/* share links appear below action area (optional) */}
            {sessionName && (
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-blue-600" /> Share Meeting
                  Links
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-slate-50 rounded-xl border p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Team Link (Internal)
                        </p>
                        <p className="text-xs text-slate-500">
                          For team members. Provides instant access.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={internalLink}
                        className="flex-1 text-sm bg-white font-mono rounded-lg"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copy(internalLink, "internal")}
                        className={`rounded-lg transition-all w-10 h-10 ${
                          copiedType === "internal"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "hover:bg-blue-100"
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-xl border p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Client Link (External)
                        </p>
                        <p className="text-xs text-slate-500">
                          For guests. Requires host approval to join.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={externalLink}
                        className="flex-1 text-sm bg-white font-mono rounded-lg"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copy(externalLink, "external")}
                        className={`rounded-lg transition-all w-10 h-10 ${
                          copiedType === "external"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "hover:bg-indigo-100"
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-green-600" />
                    All meetings are end-to-end encrypted and automatically
                    logged in Integriti CRM
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ZoomLayout>
  );
}
