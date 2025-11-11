"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/useRoleStore";
import { useUserStore } from "@/stores/useRoleStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChartProps {
  willshow: boolean;
}

interface LeadOpportunityStats {
  totalLeads: {
    value: number;
    change: string;
    trend: string;
  };
  totalOpportunities: {
    value: number;
    change: string;
    trend: string;
  };
}

export function LeadConversionChart({ willshow }: ChartProps) {
  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  const { data, isLoading, isError } = useQuery<LeadOpportunityStats>({
    queryKey: ["/api/leads/totalleadsandopp", userrole?.roleType, userrole?.id],
    queryFn: async () => {
      if (
        !activeUser?.id ||
        !userrole?.roleType ||
        !userrole?.id ||
        !activeUser?.userType
      )
        throw new Error("User role or ID not available");

      const res = await fetch(
        `/api/leads/totalleadsandopp?roleType=${encodeURIComponent(
          activeUser.userType
        )}&userId=${encodeURIComponent(activeUser?.id)}`
      );

      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!userrole?.roleType && !!userrole?.id, // wait until available
  });

  if (!willshow) return null;
  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (isError || !data)
    return <p className="text-red-500">Failed to load data</p>;

  const { totalLeads, totalOpportunities } = data;

  return (
    // Provider is removed, as it's already in App.jsx
    <div className="w-full max-w-[633px] mt-[20px] md:mt-[35px] gap-[6px] rotate-0 opacity-100 p-4 md:p-6">
      <div className="flex flex-row items-center justify-between space-y-0 pb-4 md:pb-6">
        <div className="flex items-center w-full max-w-[633px] gap-[6px] md:gap-[8px] opacity-100">
          <div className="w-[20px] h-[20px] md:w-[24px] md:h-[24px] hidden items-center justify-center">
            <img
              src="https://storage.googleapis.com/crmlogs/crm_assets/DollarIcon.png"
              alt="Dollar Icon"
              width={20}
              height={20}
              className="w-4 h-4 md:w-5 md:h-5"
            />
          </div>
          <h3 className="text-[16px] md:text-[20px] leading-[100%] tracking-[-0.2%] font-onest text-primary-text font-[500]">
            Lead Conversion Analysis
          </h3>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-3 h-3 md:w-4 md:h-4 rotate-0 opacity-50 relative p-0 cursor-pointer">
                <img
                  src="https://storage.googleapis.com/crmlogs/crm_assets/LeadIcon.png"
                  alt="Lead Icon"
                  width={13.33}
                  height={13.33}
                  className="w-[10px] h-[10px] md:w-[13.33px] md:h-[13.33px] absolute top-[1px] md:top-[1.33px]"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Analysis of new and qualified leads</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
        {/* --- New Leads --- */}
        <div className="flex flex-col space-y-6 md:space-y-8 min-w-[200px]">
          <div className="space-y-2 py-2">
            <span className="text-[14px] md:text-[16px] font-[500] leading-[100%] tracking-[-0.2%] font-onest text-primary-text">
              New Leads
            </span>
            <div className="font-[600] text-[18px] md:text-[20px] leading-[100%] tracking-[-0.2%] mt-[8px] md:mt-[10px] font-onest text-primary-text">
              {totalLeads.value.toLocaleString()}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2">
              <Badge
                className={cn(
                  totalLeads.change.startsWith("-")
                    ? "bg-[#9D46461A] text-[#9D4646]" // Red (Negative)
                    : "bg-[#469D4E1A] text-[#469D4E]" // Green (Positive or Zero)
                )}
              >
                {totalLeads.change}
              </Badge>
              <p className="text-[12px] md:text-[14px] leading-[100%] tracking-[-2%] font-[400] opacity-50 font-onest text-primary-text">
                {totalLeads.trend}
              </p>
            </div>
          </div>

          {/* --- Qualified Leads --- */}
          <div className="space-y-2">
            <span className="text-[14px] md:text-[16px] font-[500] leading-[100%] tracking-[-0.2%] font-onest text-primary-text">
              Qualified Leads
            </span>
            <div className="font-[600] text-[18px] md:text-[20px] leading-[100%] tracking-[-0.2%] font-onest text-primary-text mt-[8px] md:mt-[10px]">
              {totalOpportunities.value.toLocaleString()}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2">
              <Badge
                className={cn(
                  "rounded-[64px] px-[8px] font-onest py-[4px] w-fit",
                  totalOpportunities.change.startsWith("-")
                    ? "bg-[#9D46461A] text-[#9D4646]" // Red (Negative)
                    : "bg-[#469D4E1A] text-[#469D4E]" // Green (Positive or Zero)
                )}
              >
                {totalOpportunities.change}
              </Badge>
              <p className="text-[12px] md:text-[14px] leading-[100%] tracking-[-2%] font-[400] opacity-50 font-onest text-primary-text">
                {totalOpportunities.trend}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
