// components/layout/SidebarSkeleton.tsx
import React from "react";

export default function SidebarSkeleton() {
  return (
    <aside className="h-screen w-[240px] flex flex-col bg-[#001E40] text-white animate-pulse">
      {/* Header / Logo Placeholder */}
      <div className="flex items-center justify-center pt-8 pb-6 border-b border-[#ffffff1a]">
        <div className="w-[160px] h-[40px] bg-[#193453] rounded-md" />
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0 scrollbar-width-none [&::-webkit-scrollbar]:hidden">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-[64px] bg-[#0B4A8E]/20"
            >
              <div className="w-5 h-5 bg-[#193453] rounded-full" />
              <div className="h-3 w-24 bg-[#193453] rounded-full" />
            </div>
          ))}
        </div>

        {/* Settings section skeleton */}
        <div className="space-y-3 pt-6 border-t border-[#ffffff1a]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-[64px] bg-[#0B4A8E]/20"
            >
              <div className="w-5 h-5 bg-[#193453] rounded-full" />
              <div className="h-3 w-20 bg-[#193453] rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Profile section */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-[#ffffff1a]">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
          <div className="w-7 h-7 bg-[#193453] rounded-full" />
          <div className="flex flex-col gap-1">
            <div className="w-20 h-3 bg-[#193453] rounded-full" />
            <div className="w-12 h-2 bg-[#193453] rounded-full" />
          </div>
        </div>
      </div>
    </aside>
  );
}
