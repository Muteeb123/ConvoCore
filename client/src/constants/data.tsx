import { useQuery } from "@tanstack/react-query";
import { useRoleStore } from "@/stores/useRoleStore";
import { useUserStore } from "@/stores/useRoleStore";
export interface LeadStatsResponse {
  totaleads: { value: number; change: string; trend: string };
  totalOpportunities: { value: number; change: string; trend: string };
  totalCustomers: { value: number; change: string; trend: string };
  convertedClients: { value: number; change: string; trend: string };
}

export const DASHBOARD_TABS = [
  { key: "overview", label: "Overview" },
  // { key: "user-activity", label: "User Activity" },
  // { key: "pipeline", label: "Pipeline" },
  // { key: "reports", label: "Reports" },
];
export const FALLBACK_URL =
  "https://storage.googleapis.com/integriti-crm-avatars/fallback";

export function useDashboardCards() {
  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  const { data: leadStats, isLoading } = useQuery<LeadStatsResponse>({
    queryKey: ["/api/leads/totalcount", userrole?.roleType, userrole?.id],

    queryFn: async () => {
      if (
        !activeUser?.id ||
        !userrole?.roleType ||
        !userrole?.id ||
        !activeUser?.userType
      )
        throw new Error("User role or ID not available");

      const res = await fetch(
        `/api/leads/totalcount?roleType=${encodeURIComponent(
          activeUser.userType
        )}&userId=${encodeURIComponent(activeUser.id)}`
      );

      if (!res.ok) throw new Error("Failed to fetch lead stats");
      return res.json();
    },
    enabled: !!userrole?.roleType && !!userrole?.id,
  });

  console.log(
    `Fetched Stats for ${userrole?.roleType} with id ${userrole?.id}:`,
    leadStats
  );

  const DASHBOARD_CARDS = [
    {
      title: "Total Leads",
      value: isLoading
        ? "..."
        : leadStats?.totaleads?.value?.toLocaleString() ?? "0",
      change: isLoading ? "..." : leadStats?.totaleads?.change ?? "0%",
      changeText: isLoading
        ? "Loading..."
        : leadStats?.totaleads?.trend ?? "Higher than last month",
      changeType:
        leadStats?.totaleads?.change?.includes("-") === true
          ? "negative"
          : "positive",
      borderColor:
        "https://storage.googleapis.com/crmlogs/crm_assets/Rectangle_one.png",
      icon: "https://storage.googleapis.com/crmlogs/crm_assets/dollar-sign.png",
      cardWidth: 20,
      cardHeight: 20,
      bgColor: "#5166F11A",
    },
    {
      title: "Total Opportunities",
      value: isLoading
        ? "..."
        : leadStats?.totalOpportunities?.value?.toLocaleString() ?? "0",
      change: isLoading ? "..." : leadStats?.totalOpportunities?.change ?? "0%",
      changeText: isLoading
        ? "Loading..."
        : leadStats?.totalOpportunities?.trend ?? "Higher than last month",
      changeType:
        leadStats?.totalOpportunities?.change?.includes("-") === true
          ? "negative"
          : "positive",
      borderColor:
        "https://storage.googleapis.com/crmlogs/crm_assets/Rectangle_two.png",
      icon: "https://storage.googleapis.com/crmlogs/crm_assets/trending-up.png",
      cardWidth: 10,
      cardHeight: 10,
      bgColor: "#9879DD1A",
    },
    {
      title: "Total Customers",
      value: isLoading
        ? "..."
        : leadStats?.totalCustomers?.value?.toLocaleString() ?? "0",
      change: isLoading ? "..." : leadStats?.totalCustomers?.change ?? "0%",
      changeText: isLoading
        ? "Loading..."
        : leadStats?.totalCustomers?.trend ?? "Higher than last month",
      changeType:
        leadStats?.totalCustomers?.change?.includes("-") === true
          ? "negative"
          : "positive",
      borderColor:
        "https://storage.googleapis.com/crmlogs/crm_assets/Rectangle_three.png",
      icon: "https://storage.googleapis.com/crmlogs/crm_assets/users.png",
      cardWidth: 20,
      cardHeight: 18,
      bgColor: "#F46D471A",
    },
    {
      title: "Clients Converted",
      value: isLoading
        ? "..."
        : leadStats?.convertedClients?.value?.toLocaleString() ?? "0",
      change: isLoading ? "..." : leadStats?.convertedClients?.change ?? "0%",
      changeText: isLoading
        ? "Loading..."
        : leadStats?.convertedClients?.trend ?? "Higher than last month",
      changeType:
        leadStats?.convertedClients?.change?.includes("-") === true
          ? "negative"
          : "positive",
      borderColor:
        "https://storage.googleapis.com/crmlogs/crm_assets/Rectangle_four.png",
      icon: "https://storage.googleapis.com/crmlogs/crm_assets/packag.png",
      cardWidth: 18,
      cardHeight: 19.71,
      bgColor: "#53CDE81A",
    },
  ];

  return { DASHBOARD_CARDS, isLoading };
}
