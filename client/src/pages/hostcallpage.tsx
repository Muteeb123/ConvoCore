"use client";

import React, { useEffect, useState } from "react";
import ZoomLayout from "@/components/ZoomLayout";
import { useRoute } from "wouter";
import VideochatClientWrapper from "@/components/VideochatClientWrapper";
import {
  Loader2,
  Users as UsersIcon,
  AlertCircle,
  UserCheck,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function HostCallPage() {
  const [match, params] = useRoute("/call/host/:slug");
  const slug = params?.slug || "";
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<
    { id: string; name: string; createdAt?: number }[]
  >([]);

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
          `/api/zoom-token?session=${encodeURIComponent(slug)}&role=host`
        );
        if (!res.ok) {
          if (res.status === 409)
            setError("A host is already active for this meeting.");
          else {
            const body = await res.json().catch(() => ({}));
            setError(body?.error || `Failed to fetch token (${res.status})`);
          }
          setToken("");
          return;
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
          `/api/meetings/${encodeURIComponent(slug)}/requests`
        );
        if (res.ok) {
          const data = await res.json();
          setRequests(data.pending || []);
        }
      } catch (err) {
        console.error("Failed to poll for requests:", err);
      }
      timer = window.setTimeout(poll, 2000);
    };
    poll();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [slug, token]);

  const approve = async (id: string) => {
    try {
      await fetch(`/api/meetings/${encodeURIComponent(slug)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to approve user:", err);
    }
  };

  const endMeeting = async () => {
    try {
      await fetch(`/api/meetings/${encodeURIComponent(slug)}/end`, {
        method: "POST",
      });
      window.location.href = "/zoom";
    } catch (err) {
      console.error("Failed to end meeting:", err);
    }
  };

  return (
    <ZoomLayout
      headerTitle="Host Controls"
      headerSubtitle={decodeURIComponent(slug)}
    >
      <div className="flex flex-col gap-4 h-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">
              Initializing meeting room...
            </p>
          </div>
        ) : error || !token ? (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || "Token not available."}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="bg-white border rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Video className="w-4 h-4 mr-1.5" />
                  Host Controls
                </Badge>
                <span className="text-sm text-slate-600 hidden md:block">
                  Meeting:{" "}
                  <span className="font-medium text-slate-900">
                    {decodeURIComponent(slug)}
                  </span>
                </span>
              </div>
              <Button
                variant="destructive"
                onClick={endMeeting}
                className="h-9"
              >
                End Meeting for Everyone
              </Button>
            </div>

            {requests.length > 0 && (
              <div className="bg-amber-50 border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UsersIcon className="w-4 h-4 text-amber-800" />
                  <h3 className="text-sm font-semibold text-amber-900">
                    Pending Join Requests ({requests.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {requests.map((r) => (
                    <Card
                      key={r.id}
                      className="p-3 bg-white shadow-sm w-full sm:w-auto sm:max-w-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium">{r.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => approve(r.id)}
                          className="h-8 bg-blue-600"
                        >
                          Approve
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-[400px]">
              <Card className="flex-1 flex flex-col shadow-lg overflow-hidden border-slate-200">
                <CardContent className="p-0 flex-1 relative h-full">
                  <div className="absolute inset-0">
                    <VideochatClientWrapper
                      slug={slug}
                      JWT={token}
                      isHost={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </ZoomLayout>
  );
}
