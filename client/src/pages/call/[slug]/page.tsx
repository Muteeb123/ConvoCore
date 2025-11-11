import { getData } from "@/data/getToken";
import VideochatClientWrapper from "@/components/VideochatClientWrapper";
import Script from "next/script";
import { Loader2, Video } from "lucide-react";
import Link from "next/link";

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const jwt = await getData(params.slug, 0);

  if (!jwt) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-slate-600 space-y-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm">Preparing your secure meeting session...</p>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-full w-full p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Video Meeting</h1>
            <p className="text-xs text-slate-500">Session: {decodeURIComponent(params.slug)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Legacy route. Use <Link className="text-blue-600 underline" href={`/call/users/${params.slug}`}>/call/users/{params.slug}</Link>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        <VideochatClientWrapper slug={params.slug} JWT={jwt} isHost={false} />

        <div className="absolute bottom-3 right-4 text-[11px] text-slate-400 select-none">
          Integriti Secure Video • End-to-End Encrypted
        </div>
      </div>
      <Script src="/coi-serviceworker.js" strategy="beforeInteractive" />
    </main>
  );
}
