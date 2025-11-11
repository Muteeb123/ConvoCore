"use client";
import { MoreHorizontal } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceItem {
  id: string;
  label: string;
  percentage: string;
  icon: string;
  width: number;
}

interface ChartProps {
  willshow: boolean;
  sources?: SourceItem[];
}

export function OpportunitySourcesChart({
  willshow,
  sources = [],
}: ChartProps) {
  if (!willshow) return null;

  return (
    <div className="w-full mt-[20px] md:mt-[35px] gap-[6px] rotate-0 opacity-100 justify-self-end px-4 md:px-5 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-row items-center space-y-0 pb-4 md:pb-6">
        <div className="flex items-center gap-[4px] md:gap-[6px]">
          <img
            src="https://storage.googleapis.com/crmlogs/crm_assets/dashboardIcon.png"
            alt="dashboardIcon"
            width={18}
            height={18}
            className="w-4 h-4 md:w-[18px] md:h-[18px]"
          />
          <h3 className="text-[16px] md:text-[20px] leading-[100%] tracking-[-0.2%] font-onest text-primary-text font-[500]">
            Top Leads Sources
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
              <p>Analysis of Top Leads Sources</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-[20px] h-[20px] md:w-[24px] md:h-[24px] hidden">
          <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>

      {/* List */}
      <div className="space-y-[16px] md:space-y-[24px]">
        {sources.map((source) => (
          <div
            key={source.id}
            className="relative w-full max-w-[315px] h-[40px] md:h-[44px] bg-[#5166F11A] rounded-[12px] overflow-hidden gap-[12px] md:gap-[16px] flex items-center justify-between"
          >
            <div
              className="absolute h-full z-0 opacity-[10%] bg-[#5166F1]"
              style={{ width: `${source.width}%` }}
            ></div>

            <div className="flex items-center px-2 md:px-3 gap-2 md:gap-3">
              <div className="w-[14px] h-[14px] md:w-[16px] md:h-[16px] rounded-full flex items-center justify-center">
                <img
                  alt="lead_icon"
                  src={source.icon}
                  width={16}
                  height={16}
                  className="w-3 h-3 md:w-4 md:h-4"
                />
              </div>
              <span className="text-[14px] md:text-[16px] font-[500] leading-[100%] tracking-[-0.2%] font-onest text-primary-text">
                {source.label}
              </span>
            </div>

            <span className="text-[12px] md:text-[14px] font-[400] leading-[100%] tracking-[-0.2%] font-onest text-primary-text pr-[12px] md:pr-[16px]">
              {source.percentage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
