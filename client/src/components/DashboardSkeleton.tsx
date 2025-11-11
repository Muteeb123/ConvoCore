// File: src/components/DashboardSkeleton.tsx

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    // Removed the outer div with flex-1, overflow, padding
    <>
      {/* Tabs + Controls Skeleton */}
      <section className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="w-full flex-1 sm:w-auto sm:flex-none">
          {/* Tab Navigation Skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="flex w-full justify-end gap-2 sm:w-auto">
          {/* Controls Skeleton */}
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </section>

      {/* Analytics Cards Skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Section for Charts Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center w-full">
        {/* Left Chart Skeleton */}
        <div className="col-span-1 w-full">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="space-y-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Image Section Skeleton */}
        <div className="col-span-1 w-full max-w-[467px] mx-auto">
          <div className="relative rounded-lg border bg-card shadow-sm overflow-hidden">
            <Skeleton className="w-full h-[242px] sm:h-[207px] md:h-[220px] lg:h-[235px] xl:h-[242px]" />
            {/* Overlay labels skeleton */}
            <div className="absolute top-4 left-4">
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="absolute bottom-4 left-4">
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="absolute top-4 right-4">
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="absolute bottom-4 right-4">
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>

        {/* Right Chart Skeleton */}
        <div className="col-span-1 w-full">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="space-y-3 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Skeleton */}
      <div className="mt-6 grid grid-cols-1">
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
