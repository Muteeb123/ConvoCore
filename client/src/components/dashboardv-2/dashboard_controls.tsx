import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardControls() {
  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-[24px] w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="rounded-[64px] font-onest text-primary-text py-[8px] sm:py-[12px] px-[12px] sm:px-[16px] gap-[1px] border-[1px] border-[#11131E1] text-[14px] sm:text-[16px] leading-[100%] tracking-[-2%] font-[500] whitespace-nowrap"
          >
            <span className="hidden sm:inline">Last Week</span>
            <span className="sm:hidden">Week</span>
            <span>
              <img
                src="https://storage.googleapis.com/crmlogs/crm_assets/chevron-down.png"
                alt="Chevron Down"
                width={12}
                height={12}
                className="ml-1 sm:ml-2 sm:w-4 sm:h-4"
              />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          <DropdownMenuItem>Today</DropdownMenuItem>
          <DropdownMenuItem>Last 7 Days</DropdownMenuItem>
          <DropdownMenuItem>Last 30 Days</DropdownMenuItem>
          <DropdownMenuItem>This Year</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button className="rounded-[64px] w-[80px] sm:w-[100px] md:w-[111px] h-[36px] sm:h-[40px] md:h-[44px] font-semibold text-[14px] sm:text-[16px] font-onest leading-[100%] tracking-[-2%] bg-[#5166F1] text-[#FFFFFF] hover:bg-[#5A7FFF] py-[8px] sm:py-[10px] px-[12px] sm:px-[16px] gap-[6px] sm:gap-[10px]">
        <img
          src="https://storage.googleapis.com/crmlogs/crm_assets/arrow_icon.png"
          alt="Export"
          width={8}
          height={8}
          className="sm:w-[10px] sm:h-[10px]"
        />
        <span className="">Export</span>
      </Button>
    </div>
  );
}
