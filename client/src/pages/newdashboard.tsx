import React, { useState, useEffect } from "react";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { TabNavigation } from "../components/dashboardv-2/dashboard_navigation";
import { DashboardControls } from "../components/dashboardv-2/dashboard_controls";
import { MetricCard } from "@/components/CardsSection/Cards";
import { useDashboardCards, DASHBOARD_TABS } from "@/constants/data";
import { LeadConversionChart } from "@/components/charts/LeadConversionChart";
import { OpportunitySourcesChart } from "@/components/charts/OpportunitySourcesChart";
import { RecentActivityTable } from "@/components/tables";
import { useRoleStore } from "@/stores/useRoleStore";
import Sidebar from "../components/layout/sidebarv-2"; // Assuming sidebarv-2 is correct path
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUserStore } from "@/stores/useRoleStore";

export interface LeadQualityStats {
  qualifiedLeads: { percentage: string };
  unqualifiedLeads: { percentage: string };
  clients: { percentage: string };
  websiteInquiries: { percentage: string };
  referrals: { percentage: string };
  socialMedia: { percentage: string };
  coldCall: { percentage: string };
}

export default function NewDashboard() {
  const { DASHBOARD_CARDS, isLoading: cardsLoading } = useDashboardCards();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [viewAnalytics, setViewAnalytics] = useState(false);
  const [viewRecentActivities, setViewRecentActivities] = useState(false);
  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  console.log("Active user is : ", activeUser);

  const name = `${user?.firstName} ${user?.lastName}`;

  const { data: opportunitiesData, isLoading: statsLoading } =
    useQuery<LeadQualityStats>({
      queryKey: [
        "/api/leads/lead-quality-stats",
        activeUser?.userType,

        activeUser?.id,
      ],
      queryFn: async () => {
        if (!activeUser?.id || !userrole?.roleType || !activeUser?.userType)
          throw new Error("User role or ID not available");

        const res = await fetch(
          `/api/leads/lead-quality-stats?roleType=${encodeURIComponent(
            activeUser.userType
          )}&userId=${encodeURIComponent(activeUser.id)}`
        );

        if (!res.ok) throw new Error("Failed to fetch lead quality stats");
        return res.json();
      },
      enabled: !!userrole?.roleType && !!activeUser?.id,
    });

  useEffect(() => {
    if (!userrole) return;
    const permissions = userrole.permissions || [];
    const hasAll = true;

    setViewAnalytics(hasAll || permissions.includes("view_dashboard_stats"));
    setViewRecentActivities(
      hasAll || permissions.includes("view_recent_activities")
    );
  }, [userrole]);

  const opportunitySourcesData = opportunitiesData
    ? [
        {
          id: "website",
          label: "Website Inquiries",
          percentage: opportunitiesData.websiteInquiries?.percentage || "0%",
          icon: "https://storage.googleapis.com/crmlogs/crm_assets/Source_one.png",
          width: parseFloat(
            opportunitiesData.websiteInquiries?.percentage || "0"
          ),
        },
        {
          id: "referrals",
          label: "Referrals",
          percentage: opportunitiesData.referrals?.percentage || "0%",
          icon: "https://storage.googleapis.com/crmlogs/crm_assets/Source_two.png",
          width: parseFloat(opportunitiesData.referrals?.percentage || "0"),
        },
        {
          id: "socialMedia",
          label: "Social Media",
          percentage: opportunitiesData.socialMedia?.percentage || "0%",
          icon: "https://storage.googleapis.com/crmlogs/crm_assets/Source_three.png",
          width: parseFloat(opportunitiesData.socialMedia?.percentage || "0"),
        },
        {
          id: "coldCall",
          label: "Cold Call",
          percentage: opportunitiesData.coldCall?.percentage || "0%",
          icon: "https://storage.googleapis.com/crmlogs/crm_assets/Source_fore.png",
          width: parseFloat(opportunitiesData.coldCall?.percentage || "0"),
        },
      ]
    : [];

  // Combine loading states
  const combinedIsLoading = cardsLoading || statsLoading;

  // --- Loading State ---
  if (combinedIsLoading) {
    return (
      // 1. Root container: Full screen, no browser scrolling
      <div className="flex h-screen w-full overflow-hidden">
        {/* 2. Sidebar */}
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* 3. Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
          {/* 4. Fixed Header */}
          <DashboardHeader
            userName={name}
            subtitle="Welcome back,"
            issearch={false}
          />

          {/* Mobile Sidebar Trigger */}
          {!isSidebarOpen && (
            <div className="absolute top-[65px] left-4 z-50 md:hidden ">
              <SidebarTrigger
                className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition "
                onClick={() => setSidebarOpen(true)}
              />
            </div>
          )}

          {/* 5. Scrolling Content Wrapper (Shows Skeleton) */}
          <main className="flex-1 overflow-y-auto p-6 w-full">
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    );
  }

  // --- Main Return (When NOT Loading) ---
  return (
    // 1. Root container: Full screen, no browser scrolling
    <div className="flex h-screen w-full overflow-hidden">
      {/* 2. Sidebar: Fixed width, uses its own internal scrolling */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. Main Content Area: Fills remaining space, flex column */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* 4. Fixed Header: Stays at the top */}
        <DashboardHeader
          userName={name}
          subtitle="Welcome back,"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden ">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition "
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {/* Tabs + Controls */}
          <section className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="w-full flex-1 sm:w-auto sm:flex-none">
              <TabNavigation
                tabs={DASHBOARD_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            <div className=" w-full justify-end sm:w-auto hidden">
              <DashboardControls />
            </div>
          </section>

          {/* Analytics Cards */}
          {viewAnalytics && (
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {DASHBOARD_CARDS.map((card, index) => (
                <MetricCard key={index} card={card} willshow={!cardsLoading} />
              ))}
            </div>
          )}

          {/* Main Grid Section for Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center w-full">
            {/* Left Chart */}
            <div className="col-span-1 w-full">
              <LeadConversionChart willshow={viewAnalytics} />
            </div>

            {/* Middle Image Section */}

            {/* ============================================================
              START OF UPDATED SECTION
              ============================================================
            */}
            {viewAnalytics && (
              <div
                className="
                  relative flex justify-center items-center
                  bg-center bg-no-repeat bg-contain
                  w-[467px] h-[242px]   /* your perfect 1440px size */
                  mx-auto                /* This centers it */
                  sm:w-[400px] sm:h-[207px]
                  md:w-[420px] md:h-[220px]
                  lg:w-[440px] lg:h-[235px]
                  xl:w-[467px] xl:h-[242px]
                  /* REMOVED THE FOLLOWING LINES THAT WERE BREAKING THE CENTERING:
                    xl:right-[110px] xl:top-[100px]
                    lg:top-[100px]
                    md:top-[100px]
                  */
                "
                style={{
                  backgroundImage:
                    "url('https://storage.googleapis.com/crmlogs/crm_assets/LeadImage.png')",
                }}
              >
                {/* Top Right Button */}

                <div className="absolute -top-12 right-4 z-20 hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-[24px] h-[24px] p-0 hover:bg-gray-100"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </Button>
                </div>

                {/* Overlay Labels (Using your original pixel-based values) */}

                <div className="absolute top-[15px] xl:top-[80px] lg:top-[75px] lg:left-[40px] left-[30px] xl:left-[40px] leading-[100%] tracking-[-2%] font-onest text-[10px] xl:text-[12px] font-[400] text-primary-text z-10">
                  Leads
                </div>

                <div className="absolute top-[85px] xl:top-[190px] lg:top-[195px] lg:left-[45px] left-[30px] xl:left-[40px] leading-[100%] tracking-[-2%] font-onest text-[10px] xl:text-[12px] font-[400] text-primary-text z-10">
                  Opportunities
                </div>

                <div className="absolute top-[15px] xl:top-[20px] lg:top-[25px] lg:right-[50px] right-[30px] xl:right-[40px] leading-[100%] tracking-[-2%] font-onest text-[10px] xl:text-[12px] font-[400] text-[#9879DD] z-10">
                  Qualified Leads (
                  {opportunitiesData?.qualifiedLeads?.percentage})
                </div>

                <div className="absolute top-[50px] xl:top-[115px] right-[30px] xl:right-[40px] lg:right-[45px] lg:top-[130px] leading-[100%] tracking-[-2%] font-onest text-[10px] xl:text-[12px] font-[400] text-[#9879DD] z-10">
                  Unqualified Leads (
                  {opportunitiesData?.unqualifiedLeads?.percentage})
                </div>

                <div className="absolute bottom-[15px] xl:bottom-[40px] lg:bottom-[30px] right-[30px] xl:right-[40px] leading-[100%] tracking-[-2%] font-onest text-[10px] xl:text-[12px] font-[400] text-[#9879DD] z-10">
                  Clients ({opportunitiesData?.clients?.percentage})
                </div>
              </div>
            )}
            {/* ============================================================
              END OF UPDATED SECTION
              ============================================================
            */}
            {/* Right Chart */}
            <div className="col-span-1 w-full">
              <OpportunitySourcesChart
                willshow={viewAnalytics}
                sources={opportunitySourcesData}
              />
            </div>
          </div>

          {/* Recent Activities */}
          <div className="mt-6 grid grid-cols-1">
            <RecentActivityTable willshow={viewRecentActivities} />
          </div>
        </main>
      </div>
    </div>
  );
}
