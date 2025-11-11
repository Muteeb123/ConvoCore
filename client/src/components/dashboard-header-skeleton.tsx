import { Skeleton } from "@/components/ui/skeleton";

export function DashboardHeaderSkeleton() {
  return (
    <header className="flex h-[80px] md:h-[103px] shrink-0 items-center justify-between px-4 md:px-6 py-4 md:py-6 border-b bg-white">
      {/* Left Side: Title and Subtitle */}
      <div className="flex items-center gap-2">
        <Skeleton className="mr-2 h-4 w-px hidden sm:block" />
        <div className="flex flex-col gap-[6px]">
          {/* Subtitle */}
          <Skeleton className="h-4 w-24 hidden sm:block" />
          {/* User Name */}
          <Skeleton className="h-6 w-32 md:w-40" />
        </div>
      </div>

      {/* Right Side: Search and Icons */}
      <div className="gap-3 md:gap-[24px] flex items-center">
        {/* Desktop Search Bar */}
        <Skeleton className="hidden md:flex h-[44px] w-[200px] lg:w-[235px] rounded-full" />

        {/* Mobile Search Icon */}
        <Skeleton className="h-10 w-10 md:hidden rounded-full" />

        {/* Notification Icon */}
        <Skeleton className="h-10 w-10 md:h-[44px] md:w-[44px] rounded-full" />
      </div>
    </header>
  );
}
