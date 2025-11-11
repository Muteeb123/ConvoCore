import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import VideochatClientWrapper from "@/components/VideochatClientWrapper";
import { Loader2 } from "lucide-react";

export default function CallPage() {
  const [match, params] = useRoute("/call/:slug");
  const slug = params?.slug || "";
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<{ id: string; name: string; createdAt: number }[]>([]);

  useEffect(() => {
    if (!slug) return;
    const fetchToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/zoom-token?session=${encodeURIComponent(slug)}&role=host`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Failed to fetch token (${res.status})`);
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
    if (!slug) return;
    let timer: number;
    const poll = async () => {
      try {
        const res = await fetch(`/api/meetings/${encodeURIComponent(slug)}/requests`);
        if (res.ok) {
          const data = await res.json();
          setRequests(data.pending || []);
        }
      } catch {}
      timer = window.setTimeout(poll, 2000);
    };
    poll();
    return () => { if (timer) window.clearTimeout(timer); };
  }, [slug]);

  const approve = async (id: string) => {
    try {
      await fetch(`/api/meetings/${encodeURIComponent(slug)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {}
  };

  const endMeeting = async () => {
    try {
      await fetch(`/api/meetings/${encodeURIComponent(slug)}/end`, { method: "POST" });
      window.location.href = "/";
    } catch {}
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Invalid route</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error || "Token not available"}</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-stretch p-0">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="text-sm text-muted-foreground">Host Controls</div>
        <div className="flex items-center gap-2">
          <button className="rounded bg-rose-600 text-white px-3 py-1 text-sm" onClick={endMeeting}>End call for everyone</button>
        </div>
      </div>
      {requests.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b">
          <div className="text-sm font-medium mb-2">Join requests</div>
          <div className="flex flex-wrap gap-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center gap-2 rounded border px-2 py-1 bg-white">
                <div className="text-sm">{r.name}</div>
                <button className="rounded bg-blue-600 text-white px-2 py-1 text-xs" onClick={() => approve(r.id)}>Approve</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1">
        <VideochatClientWrapper slug={slug} JWT={token} isHost={true} />
      </div>
    </main>
  );
}
