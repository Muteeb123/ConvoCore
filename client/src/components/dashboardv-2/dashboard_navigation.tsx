import { cn } from "@/lib/utils";
import { DASHBOARD_TABS } from "@/constants/data";

type DashboardTab = (typeof DASHBOARD_TABS)[number];

interface TabNavigationProps {
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="flex items-center justify-around bg-[#F5F6F9] rounded-[64px] p-[4px] gap-[2px] sm:gap-[4px] w-full sm:w-auto min-w-0">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "px-[8px] sm:px-[10px] py-[10px] sm:py-[8px] rounded-[64px] font-onest text-[12px] sm:text-[16px] leading-[100%] whitespace-nowrap flex-1 sm:flex-none text-center",
            activeTab === tab.key
              ? "bg-[#FFFFFF] text-primary-text  leading-[100%] tracking-[-2%] font-[500] "
              : "opacity-50 text-primary-text font-[400] leading-[100%] tracking-[-2%]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
