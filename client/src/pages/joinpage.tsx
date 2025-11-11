import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import VideochatClientWrapper from "@/components/VideochatClientWrapper";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function PublicJoinPage() {
  const [match, params] = useRoute("/join/:slug");
  const slug = params?.slug || "";
  const [approvalId, setApprovalId] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [stage, setStage] = useState<"request" | "waiting" | "approved" | "ended">("request");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setStage("request");
    setToken("");
    setApprovalId("");
  }, [slug]);

  useEffect(() => {
    if (!slug || !approvalId || stage !== "waiting") return;
    let timer: number;
    const poll = async () => {
      try {
        const endedRes = await fetch(`/api/meetings/${encodeURIComponent(slug)}/state`);
        if (endedRes.ok) {
          const s = await endedRes.json();
          if (s.ended) {
            setStage("ended");
            setLoading(false);
            return;
          }
        }
        const res = await fetch(`/api/meetings/${encodeURIComponent(slug)}/approval?id=${encodeURIComponent(approvalId)}`);
        if (res.status === 410) {
          setStage("ended");
          setLoading(false);
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
    try {
      setLoading(true);
      const res = await fetch(`/api/meetings/${encodeURIComponent(slug)}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Guest" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to request join (${res.status})`);
      }
      const data = await res.json();
      setApprovalId(data.id);
      setStage("waiting");
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
      setLoading(false);
    }
  };

  if (!match) {
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Invalid join link</div>
      </div>
    );
</main>
</div>
</div>
  }

  if (stage === "approved" && token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <VideochatClientWrapper slug={slug} JWT={token} isHost={false} />
      </main>
    );
  }

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
      {stage === "request" && (
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold text-center">Join {slug}</h2>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-60"
            disabled={!slug}
            onClick={submitRequest}
          >
            Request to join
          </button>
        </div>
      )}
      {stage === "waiting" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
          <div className="text-sm text-muted-foreground">Waiting for host approval…</div>
        </div>
      )}
      {stage === "ended" && (
        <div className="text-center text-sm">The meeting has ended.</div>
      )}
      {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
    </main>
</div>
</div>
  );
}
