"use client";

import { MoreHorizontal } from "lucide-react";
import { useRoleStore } from "@/stores/useRoleStore";
import { useUserStore } from "@/stores/useRoleStore";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Lead {
  id: string;
  name: string;
  email: string;
  companyName: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  assignedUserName: string;
  value: string;
}

interface ChartProps {
  willshow: boolean;
}

export function RecentActivityTable({ willshow }: ChartProps) {
  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads", userrole?.roleType, activeUser?.id], // Include role & user in key
    queryFn: async () => {
      if (!activeUser?.id || !userrole?.roleType || !userrole?.id)
        throw new Error("User role or ID not available");
      const response = await fetch(
        `/api/leads?limit=2&roleType=${encodeURIComponent(
          userrole?.roleType
        )}&userId=${encodeURIComponent(activeUser?.id)}`
      );
      return response.json();
    },
  });

  if (!willshow) return null;

  return (
    <div className="w-full px-6 pt-2">
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="w-[24px] h-[24px] flex items-center justify-center">
            <img
              src="https://storage.googleapis.com/crmlogs/crm_assets/ClockIcon.png"
              alt="Clock Icon"
              width={20}
              height={20}
            />
          </div>
          <h3 className="text-[20px] leading-[100%] tracking-[-0.2%] text-primary-text font-onest font-[400]">
            Recent Leads
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
              <p>Recent Leads</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-[24px] h-[24px] hidden">
          <MoreHorizontal className="w-5 h-5" />
        </div>
      </div>

      <div className="rounded-[12px] overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-[#F5F6F9] border-none font-onest">
                <TableHead className="text-[14px] font-[400] text-primary-text font-onest opacity-50 px-4 py-4 h-[48px] first:rounded-tl-[12px] whitespace-nowrap">
                  Id
                </TableHead>
                <TableHead className="text-[14px] font-[400] text-primary-text font-onest opacity-50 px-4 py-4 h-[48px] first:rounded-tl-[12px] whitespace-nowrap">
                  Lead
                </TableHead>
                <TableHead className="text-[14px] font-[400] text-primary-text font-onest opacity-50 px-4 py-4 h-[48px] whitespace-nowrap">
                  Company
                </TableHead>
                <TableHead className="text-[14px] font-[400] text-primary-text font-onest opacity-50 px-4 py-4 h-[48px] whitespace-nowrap">
                  Status
                </TableHead>
                <TableHead className="text-[14px] font-[400] text-primary-text font-onest opacity-50 px-4 py-4 h-[48px] whitespace-nowrap">
                  Assigned To
                </TableHead>
                <TableHead className="text-[14px] font-[400] text-primary-text font-onest opacity-50 px-4 py-4 h-[48px] last:rounded-tr-[12px] whitespace-nowrap">
                  Value
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-[14px] font-[400] text-primary-text font-onest opacity-50">
                      Loading leads...
                    </div>
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-[14px] font-[400] text-primary-text font-onest opacity-50">
                      No recent leads found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead, index) => (
                  <TableRow
                    key={lead.id}
                    className={`border-none h-[64px] ${
                      index === leads.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <TableCell className="px-4 py-4">
                      <div className="text-[14px] font-[400] text-primary-text font-onest leading-[100%] tracking-[-0.2%] whitespace-nowrap">
                        {lead.id}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {/* <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {lead.name?.charAt(0).toUpperCase() || "U"}
                        </div> */}
                        <div className="flex flex-col">
                          <div className="text-[14px] font-[500] text-primary-text font-onest leading-[100%] tracking-[-0.2%]">
                            {lead.name}
                          </div>
                          <div className="text-[12px] font-[400] text-primary-text font-onest opacity-60 mt-1">
                            {lead.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="text-[14px] font-[400] text-primary-text font-onest leading-[100%] tracking-[-0.2%] whitespace-nowrap">
                        {lead.companyName}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge
                        className={`
                          rounded-[16px] px-3 py-1.5 text-[12px] font-[500] leading-[100%] tracking-[-0.2%] font-onest whitespace-nowrap capitalize
                          ${
                            lead.status === "new"
                              ? "bg-[#3B82F61A] text-[#3B82F6]"
                              : lead.status === "contacted"
                              ? "bg-[#ECB8541A] text-[#ECB854]"
                              : lead.status === "qualified"
                              ? "bg-[#8B5CF61A] text-[#8B5CF6]"
                              : lead.status === "converted"
                              ? "bg-[#469D4E1A] text-[#469D4E]"
                              : "bg-[#FEE2E2] text-[#EF4444]"
                          }
                        `}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="text-[14px] font-[400] text-primary-text font-onest leading-[100%] tracking-[-0.2%] whitespace-nowrap">
                        {lead.assignedUserName || "Unassigned"}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="text-[14px] font-[600] text-primary-text font-onest leading-[100%] tracking-[-0.2%] whitespace-nowrap">
                        ${lead.value || "0"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
