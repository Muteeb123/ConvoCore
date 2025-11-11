import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Trophy, DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react";

interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalOpportunities: number;
  totalRevenue: number;
  conversionRate: number;
  tasksCompleted: number;
  leadChange: number;    
  customerChange: number;
  opportunityChange: number;
  revenueChange: number;
  taskChange: number;
}

export function KPICards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard-stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiData = [
    {
      title: "Total Leads",
      value: stats?.totalLeads || 0,
      change: stats?.leadChange !== undefined ? `${stats.leadChange.toFixed(1)}%` : "0%",
      isPositive: (stats?.leadChange || 0) >= 0,
      icon: Target,
      color: "bg-blue-100 text-primary",
    },
    {
      title: "Conversion Rate",
      value: `${(stats?.conversionRate || 0).toFixed(1)}%`,
      change: stats?.leadChange !== undefined ? `${stats.leadChange.toFixed(1)}%` : "0%",
      isPositive: (stats?.leadChange || 0) >= 0,
      icon: Trophy,
      color: "bg-green-100 text-success",
    },
    {
      title: "Revenue",
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      change: stats?.revenueChange !== undefined ? `${stats.revenueChange.toFixed(1)}%` : "0%",
      isPositive: (stats?.revenueChange || 0) >= 0,
      icon: DollarSign,
      color: "bg-yellow-100 text-warning",
    },
    {
      title: "Active Customers",
      value: stats?.totalCustomers || 0,
      change: stats?.customerChange !== undefined ? `${stats.customerChange.toFixed(1)}%` : "0%",
      isPositive: (stats?.customerChange || 0) >= 0,
      icon: Users,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                  <p className={`text-sm flex items-center mt-2 ${kpi.isPositive ? 'text-success' : 'text-warning'
                    }`}>
                    <TrendIcon className="w-3 h-3 mr-1" />
                    {kpi.change} from last month
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}