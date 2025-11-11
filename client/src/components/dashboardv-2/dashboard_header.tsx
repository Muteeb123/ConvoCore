import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationModal } from "@/components/modals/notification-model";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface DashboardHeaderProps {
  userName: string;
  subtitle: string;
  issearch: boolean;
}
export function DashboardHeader({
  userName,
  subtitle,
  issearch = true,
}: DashboardHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false); // State for modal
  return (
    <>
      <header className="flex h-[80px] md:h-[103px] shrink-0 items-center justify-between px-4 md:px-6 py-4 md:py-6 border-b bg-white">
        <div className="flex items-center gap-2">
          <Separator
            orientation="vertical"
            className="mr-2 h-4 hidden sm:block"
          />
          <div className="flex flex-col gap-[6px]">
            <span className="text-primary-text text-[14px] md:text-[16px] font-[400] leading-[100%] tracking-[-2%] font-onest opacity-50 hidden sm:block">
              {subtitle}
            </span>
            <span className="text-primary-text text-[18px] md:text-[24px] font-[500] leading-[100%] tracking-[-2%] font-onest">
              {userName}
            </span>
          </div>
        </div>

        <div className="gap-3 md:gap-[24px] flex items-center">
          {issearch && (
            <div className="hidden md:flex items-center gap-3 bg-[#F5F6F9] rounded-full px-3 py-2 w-[200px] lg:w-[235px] h-[44px]">
              <Search className="h-[20px] w-[20px] lg:h-[24px] lg:w-[24px] text-primary-text flex-shrink-0 " />
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent border-none outline-none text-primary-text font-[500] leading-[100%] tracking-[-2%] text-[14px] lg:text-[16px] font-onest flex-1 placeholder:text-primary-text min-w-0"
              />
              <div className="flex items-center gap-[6px] bg-[#FFFFFF] px-2 py-1 rounded-[64px] flex-shrink-0">
                <img
                  src="https://storage.googleapis.com/crmlogs/crm_assets/KLogo.png"
                  alt="Command Logo"
                  width={14}
                  height={14}
                  className="object-contain"
                />
                <span className="text-primary-text text-[13px] font-[500] font-onest">
                  K
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="h-[40px] w-[40px] md:hidden rounded-[64px] bg-[#F5F6F9]"
          >
            <Search className="h-5 w-5 text-primary-text" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-[40px] w-[40px] md:h-[44px] md:w-[44px] rounded-[64px] bg-[#FFFFFF] border border-[#11131E1A]"
            onClick={() => setIsNotificationOpen(true)} // Open modal on click
          >
            <img
              src="https://storage.googleapis.com/crmlogs/crm_assets/Bell.png"
              alt="Bell Icon"
              width={17}
              height={19}
              className="h-4 w-4 md:h-5 md:w-5"
            />
          </Button>
        </div>
      </header>

      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/20 z-50 md:hidden">
          <div className="bg-white p-4 shadow-lg">
            <div className="flex items-center gap-3 bg-[#F5F6F9] rounded-full px-3 py-2 h-[44px]">
              <Search className="h-5 w-5 text-primary-text flex-shrink-0" />
              <input
                type="text"
                placeholder="Search"
                autoFocus
                className="bg-transparent border-none outline-none text-primary-text font-[500] leading-[100%] tracking-[-2%] text-[16px] font-onest flex-1 placeholder:text-primary-text"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
}
