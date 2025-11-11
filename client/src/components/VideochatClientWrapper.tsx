"use client";

import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const Videochat = lazy<
  React.ComponentType<{ slug: string; JWT: string; isHost: boolean }>
>(() => import("./Videochat"));

export default function VideochatClientWrapper({
  slug,
  JWT,
  isHost,
}: {
  slug: string;
  JWT: string;
  isHost: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-300">Loading video client...</p>
        </div>
      }
    >
      <Videochat slug={slug} JWT={JWT} isHost={isHost} />
    </Suspense>
  );
}
