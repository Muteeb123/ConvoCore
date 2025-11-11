"use client";

import { useState, useEffect } from "react";
import { TabNavigation } from "./dashboard_navigation";
import { DashboardControls } from "./dashboard_controls";
import { MetricCard } from "@/components/CardsSection/Cards";
import { DASHBOARD_CARDS, DASHBOARD_TABS } from "@/constants/data";
import { LeadConversionChart } from "@/components/charts/LeadConversionChart";
import { OpportunitySourcesChart } from "@/components/charts/OpportunitySourcesChart";
import { RecentActivityTable } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useRoleStore } from "@/stores/useRoleStore";


import Sidebar from "../layout/sidebarv-2";
import Header from "../layout/headerv-2";

const NewDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Permission state variables from your old dashboard
  const [viewAnalytics, setViewAnalytics] = useState(false);
  const [viewRecentActivities, setViewRecentActivities] = useState(false);
  const [viewRecentLeads, setViewRecentLeads] = useState(false);
  const [viewUpcommingTasks, setViewUpcommingTasks] = useState(false);

  const userrole = useRoleStore((state) => state.role);
 
  // Permission logic from your old dashboard
  useEffect(() => {
    if(userrole){

      console.log("User Role in Dashboard:", userrole);

    }
    

    const permissions = userrole?.permissions || [];
    const hasAll = permissions.includes("all");
    setViewAnalytics(hasAll || permissions.includes("view_dashboard_stats"));
    setViewRecentActivities(
      hasAll || permissions.includes("view_recent_activities")
    );
    setViewRecentLeads(hasAll || permissions.includes("view_leads"));
    setViewUpcommingTasks(hasAll || permissions.includes("view_tasks"));
  }, [userrole]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName="Rizwan Iqbal" />

        {/* The main content area is now scrollable, like in your old dashboard */}
        <main className="flex-1 overflow-y-auto">
          <section className="flex flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-0 sm:px-6">
            <div className="w-full flex-1 sm:w-auto sm:flex-none">
              <TabNavigation
                tabs={DASHBOARD_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            <div className="flex w-full justify-end sm:w-auto">
              <DashboardControls />
            </div>
          </section>

          <div className="flex flex-1 flex-col gap-6 px-6 py-4">
            {/* INTEGRATION 1: KPI Cards and Charts are now controlled by 'viewAnalytics' */}
            {viewAnalytics && (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {DASHBOARD_CARDS.map((card, index) => (
                    <MetricCard key={index} card={card} willshow={viewAnalytics}/>
                  ))}
                </div>

                <section className="w-full">
                  <div className="flex w-full flex-wrap items-center justify-center gap-4 lg:gap-6 xl:items-center xl:justify-between xl:gap-8">
                    <div className="flex w-full justify-center lg:max-w-[400px] xl:flex-shrink-0">
                      <div className="w-full max-w-[400px]">
                        <LeadConversionChart willshow={viewAnalytics}/>
                      </div>
                    </div>
                    <div className="relative flex w-full max-w-[430px] items-start md:justify-center lg:flex-1 xl:-ml-36 xl:pt-[109px]">
                        {/* This is the Sankey Chart Image section, it is part of analytics */}
                        {/* ... (Image and absolute positioned divs for labels remain the same) ... */}
                        <Image
                            src="/assets/LeadImage.png"
                            alt="Lead Conversion Flow Chart"
                            width={467}
                            height={242}
                            className="object-contain w-[300px] h-[155px] sm:w-[350px] sm:h-[181px] md:w-[400px] md:h-[207px] lg:min-w-[467px] lg:min-h-[242px]"
                            priority
                        />
                    </div>
                    <div className="flex w-full justify-start sm:justify-center xl:w-[350px] xl:flex-shrink-0 xl:justify-start">
                      <div className="w-full max-w-[420px] xl:w-full xl:max-w-none">
                        <OpportunitySourcesChart willshow={viewAnalytics}/>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* INTEGRATION 2: Recent Activity Table is now controlled by 'viewRecentActivities' */}
            {viewRecentActivities && (
              <div className="grid grid-cols-1 gap-6">
                  <RecentActivityTable willshow={viewRecentActivities}/>
              </div>
            )}

            {/* INTEGRATION 3: Add placeholders for missing components */}
            {/* You can add your LeadsTable and TasksWidget components here when ready */}

          </div>
        </main>
      </div>
    </div>
  );
};

export default NewDashboard;