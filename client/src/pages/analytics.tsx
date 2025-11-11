import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronDown, Users, X } from "lucide-react";
import { format } from "date-fns";
import SemiCircleGauge from "@/components/analytics/SemiCircleGauge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import AnalyticsComparison from "./analytics_comparison";
import ModernDatePicker from "./DatePicker";
import UserAnalyticsTable from "./UserAnalytics";
type FilterType = "monthly" | "quarterly" | "yearly" | "overall" | "custom";
import AIAnalyticsChat from "@/components/AIAnalyticsChat";
interface DateRangeType {
  startDate: Date;
  endDate: Date;
}

interface Team {
  id: number;
  name: string;
}

interface AnalyticsContentProps {
  queryKeyPrefix?: string;
  showInGrid?: boolean;
}

export const AnalyticsContent: React.FC<AnalyticsContentProps> = ({
  queryKeyPrefix = "analytics",
  showInGrid = true,
}) => {
  const [filterType, setFilterType] = useState<FilterType>("monthly");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeType>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const teamDropdownRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json() as Promise<Team[]>;
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTeamDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (filter: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredFilter(filter);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredFilter(null);
    }, 200);
  };

  const { data: leadData, isLoading: leadLoading } = useQuery({
    queryKey: [
      `${queryKeyPrefix}-leadConversion`,
      dateRange.startDate,
      dateRange.endDate,
      filterType,
      selectedTeamId,
    ],
    queryFn: async () => {
      const response = await fetch("/api/analytics/leads-to-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate:
            filterType === "overall"
              ? undefined
              : format(dateRange.startDate, "yyyy-MM-dd"),
          endDate:
            filterType === "overall"
              ? undefined
              : format(dateRange.endDate, "yyyy-MM-dd"),
          teamId: selectedTeamId || undefined,
        }),
      });
      return response.json();
    },
  });

  const { data: opportunityData, isLoading: opportunityLoading } = useQuery({
    queryKey: [
      `${queryKeyPrefix}-opportunityConversion`,
      dateRange.startDate,
      dateRange.endDate,
      filterType,
      selectedTeamId,
    ],
    queryFn: async () => {
      const response = await fetch("/api/analytics/opportunity-to-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate:
            filterType === "overall"
              ? undefined
              : format(dateRange.startDate, "yyyy-MM-dd"),
          endDate:
            filterType === "overall"
              ? undefined
              : format(dateRange.endDate, "yyyy-MM-dd"),
          teamId: selectedTeamId || undefined,
        }),
      });
      return response.json();
    },
  });

  const { data: fullFunnelData, isLoading: fullFunnelLoading } = useQuery({
    queryKey: [
      `${queryKeyPrefix}-fullFunnelConversion`,
      dateRange.startDate,
      dateRange.endDate,
      filterType,
      selectedTeamId,
    ],
    queryFn: async () => {
      const response = await fetch("/api/analytics/conversion-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate:
            filterType === "overall"
              ? undefined
              : format(dateRange.startDate, "yyyy-MM-dd"),
          endDate:
            filterType === "overall"
              ? undefined
              : format(dateRange.endDate, "yyyy-MM-dd"),
          teamId: selectedTeamId || undefined,
        }),
      });
      return response.json();
    },
  });

  const handleFilterChange = (filter: FilterType) => {
    setFilterType(filter);
    setShowDropdown(false);
    if (filter !== "overall") {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: new Date(value),
    }));
  };

  const handleTeamSelect = (teamId: number | null) => {
    setSelectedTeamId(teamId);
    setShowTeamDropdown(false);
  };

  const selectedTeam = teamsData?.find((team) => team.id === selectedTeamId);
  console.log("cc", selectedTeamId);
  return (
    <div>
      {/* Filter Dropdown */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          {/* Date Filter Dropdown */}
          <div ref={dropdownRef} className="relative w-full md:w-auto">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full md:w-auto flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {filterType === "overall"
                    ? "All Time"
                    : filterType === "monthly"
                    ? "This Month"
                    : filterType === "quarterly"
                    ? "This Quarter"
                    : filterType === "yearly"
                    ? "This Year"
                    : "Custom Date"}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  showDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50 animate-fadeIn">
                {["overall", "monthly", "quarterly", "yearly", "custom"].map(
                  (filter) => (
                    <div
                      key={filter}
                      className="relative"
                      onMouseEnter={() => handleMouseEnter(filter)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        onClick={() => {
                          if (filter === "overall")
                            handleFilterChange("overall");
                          if (filter === "custom") {
                            setShowDatePicker(true);
                            setFilterType("custom");
                            setShowDropdown(false);
                          }
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-200 
                        ${
                          filterType === filter
                            ? "text-[#475569] font-medium"
                            : ""
                        } hover:bg-[#5A7FFF] hover:text-white rounded-lg`}
                      >
                        {filter === "overall"
                          ? "All Time"
                          : filter === "monthly"
                          ? "This Month"
                          : filter === "quarterly"
                          ? "This Quarter"
                          : filter === "yearly"
                          ? "This Year"
                          : "Custom Date Range"}
                      </button>

                      {filter === "monthly" && hoveredFilter === "monthly" && (
                        <div
                          className="absolute top-0 left-full ml-2 flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-48 overflow-y-auto max-h-64 animate-slideIn"
                          onMouseEnter={() => handleMouseEnter(filter)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const monthName = new Date(0, i).toLocaleString(
                              "default",
                              {
                                month: "long",
                              }
                            );
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  const year = new Date().getFullYear();
                                  const start = new Date(year, i, 1);
                                  const end = new Date(year, i + 1, 0);
                                  setFilterType("monthly");
                                  setDateRange({
                                    startDate: start,
                                    endDate: end,
                                  });
                                  setShowDropdown(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-[#475569] hover:bg-[#5A7FFF] hover:text-white"
                              >
                                {monthName}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {filter === "quarterly" &&
                        hoveredFilter === "quarterly" && (
                          <div
                            className="absolute top-0 left-full ml-2 flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-52 overflow-hidden animate-slideIn"
                            onMouseEnter={() => handleMouseEnter(filter)}
                            onMouseLeave={handleMouseLeave}
                          >
                            {[
                              { name: "Q1 (Jan–Mar)", start: 0, end: 2 },
                              { name: "Q2 (Apr–Jun)", start: 3, end: 5 },
                              { name: "Q3 (Jul–Sep)", start: 6, end: 8 },
                              { name: "Q4 (Oct–Dec)", start: 9, end: 11 },
                            ].map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  const year = new Date().getFullYear();
                                  const start = new Date(year, q.start, 1);
                                  const end = new Date(year, q.end + 1, 0);
                                  setFilterType("quarterly");
                                  setDateRange({
                                    startDate: start,
                                    endDate: end,
                                  });
                                  setShowDropdown(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-[#475569] hover:bg-[#5A7FFF] hover:text-white"
                              >
                                {q.name}
                              </button>
                            ))}
                          </div>
                        )}

                      {filter === "yearly" && hoveredFilter === "yearly" && (
                        <div
                          className="absolute top-0 left-full ml-2 flex flex-col bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-40 overflow-hidden animate-slideIn"
                          onMouseEnter={() => handleMouseEnter(filter)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {Array.from({ length: 6 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <button
                                key={year}
                                onClick={() => {
                                  const start = new Date(year, 0, 1);
                                  const end = new Date(year, 11, 31);
                                  setFilterType("yearly");
                                  setDateRange({
                                    startDate: start,
                                    endDate: end,
                                  });
                                  setShowDropdown(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-[#475569] hover:bg-[#5A7FFF] hover:text-white"
                              >
                                {year}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Team Filter Dropdown */}
          <div ref={teamDropdownRef} className="relative w-full md:w-auto">
            <button
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              className="w-full md:w-auto flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{selectedTeam ? selectedTeam.name : "All Teams"}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  showTeamDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showTeamDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50 animate-fadeIn max-h-64 overflow-y-auto">
                <button
                  onClick={() => handleTeamSelect(null)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-200 hover:bg-[#5A7FFF] hover:text-white rounded-lg ${
                    selectedTeamId === null ? "bg-[#F0F4FF] font-medium" : ""
                  }`}
                >
                  All Teams
                </button>
                {teamsLoading ? (
                  <div className="px-4 py-2.5 text-sm text-[#64748B]">
                    Loading teams...
                  </div>
                ) : (
                  teamsData?.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-all duration-200 hover:bg-[#5A7FFF] hover:text-white rounded-lg ${
                        selectedTeamId === team.id
                          ? "bg-[#F0F4FF] font-medium"
                          : ""
                      }`}
                    >
                      {team.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {filterType === "custom" && (
            <div className="flex flex-col md:flex-row gap-3">
              <ModernDatePicker
                value={dateRange.startDate}
                onChange={(date) =>
                  handleDateChange("startDate", format(date, "yyyy-MM-dd"))
                }
                label="Start Date"
              />
              <ModernDatePicker
                value={dateRange.endDate}
                onChange={(date) =>
                  handleDateChange("endDate", format(date, "yyyy-MM-dd"))
                }
                label="End Date"
              />
            </div>
          )}

          {leadData?.data?.period && filterType !== "custom" && (
            <div className="text-xs md:text-sm text-[#64748B]">
              {leadData.data.period}
            </div>
          )}
        </div>
      </div>

      {/* Semi-Circle Gauges */}
      <div
        className={`grid ${
          showInGrid
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        } gap-6`}
      >
        <SemiCircleGauge
          title="Lead to Opportunity"
          percentage={leadData?.data?.qualifiedPercentage || 0}
          convertedValue={leadData?.data?.qualifiedLeads || 0}
          totalValue={leadData?.data?.totalLeads || 0}
          label="Qualified"
          isLoading={leadLoading}
          color="#3B82F6"
        />

        <SemiCircleGauge
          title="Opportunity to Customer"
          percentage={opportunityData?.data?.closedWonPercentage || 0}
          convertedValue={opportunityData?.data?.closedWonOpportunities || 0}
          totalValue={opportunityData?.data?.totalOpportunities || 0}
          label="Closed Won"
          isLoading={opportunityLoading}
          color="#8B5CF6"
        />

        <SemiCircleGauge
          title="Lead to Customer"
          percentage={fullFunnelData?.data?.conversionPercentage || 0}
          convertedValue={fullFunnelData?.data?.qualifiedClosedWonLeads || 0}
          totalValue={fullFunnelData?.data?.totalLeads || 0}
          label="Converted"
          isLoading={fullFunnelLoading}
          color="#10B981"
        />
      </div>
    </div>
  );
};

const Analytics = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        <DashboardHeader
          userName="Analytics"
          subtitle="Track your sales funnel performance"
          issearch={false}
        />

        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 w-full">
          {/* Header with Compare Button */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-[#1E293B] mb-1">
                Conversion Analytics
              </h1>
              <p className="text-sm text-[#64748B]">
                Track your sales funnel performance
              </p>
            </div>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="px-4 py-2 bg-[#5A7FFF] text-white rounded-lg text-sm font-medium hover:bg-[#4169E1] transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {showComparison ? (
                <>
                  <X className="w-4 h-4" />
                  Close Comparison
                </>
              ) : (
                "Compare"
              )}
            </button>
          </div>

          {/* Main Content - Conditional Layout */}
          <div
            className={`grid ${
              showComparison ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            } gap-6`}
          >
            {/* Original Analytics */}
            <div>
              <AnalyticsContent
                queryKeyPrefix="analytics"
                showInGrid={!showComparison}
              />
            </div>
            <div className="w-full">
              <AIAnalyticsChat />
            </div>

            {/* Comparison Analytics - Only Shows When Button Clicked */}
            {showComparison && (
              <div>
                <AnalyticsComparison />
              </div>
            )}
          </div>
          <div className="mt-8">
            <UserAnalyticsTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
