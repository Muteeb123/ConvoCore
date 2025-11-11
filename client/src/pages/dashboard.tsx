import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { SalesPipeline } from "@/components/dashboard/sales-pipeline";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { useState, useEffect } from "react";
import { useRoleStore } from "@/stores/useRoleStore";

export default function Dashboard() {
  const [viewAnalytics, setViewAnalytics] = useState(false);
  const [viewRecentActivities, setViewRecentActivities] = useState(false);
  const [viewRecentLeads, setViewRecentLeads] = useState(false);
  const [viewUpcommingTasks, setViewUpcommingTasks] = useState(false);

  const userrole = useRoleStore((state) => state.role);
  console.log("User Role in Dashboard:", userrole);
  useEffect(() => {
   if (!userrole) return; // wait until it's set
  const permissions = userrole.permissions || [];
  const hasAll = permissions.includes("all");
  setViewAnalytics(hasAll || permissions.includes("view_dashboard_stats"));
  setViewRecentActivities(hasAll || permissions.includes("view_recent_activities"));
  setViewRecentLeads(hasAll || permissions.includes("view_leads"));
  setViewUpcommingTasks(hasAll || permissions.includes("view_tasks"));
  }, [userrole]);
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" subtitle="Welcome back!" />
        <main className="flex-1 overflow-y-auto p-6">
          {viewAnalytics && <KPICards />}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2">
            <div className="lg:col-span-2">
              {viewRecentLeads && <LeadsTable />}
            </div>
            <div className="lg:col-span-1">
              {viewUpcommingTasks && <TasksWidget />}
            </div>
          </div>
              <div className="grid grid-cols-1 lg:grid-cols-1 mb-8">
              {viewRecentActivities && <RecentActivities />}
            </div>
        </main>
      </div>
    </div>
  );
}
