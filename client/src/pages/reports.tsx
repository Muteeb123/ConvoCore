import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Filter, TrendingUp, TrendingDown, Users, Target, DollarSign, Trophy } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalOpportunities: number;
  totalRevenue: number;
  conversionRate: number;
  tasksCompleted: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [reportType, setReportType] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard-stats"],
  });

  const { data: pipeline, isLoading: pipelineLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/sales-pipeline"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculatePipelineTotal = () => {
    if (!pipeline) return 0;
    return pipeline.reduce((total, stage) => total + stage.value, 0);
  };

  const getConversionTrend = (rate: number) => {
    // Mock trend calculation - in real app, compare with previous period
    const trend = Math.random() > 0.5 ? "up" : "down";
    const change = (Math.random() * 5).toFixed(1);
    return { trend, change };
  };

  const conversionTrend = stats ? getConversionTrend(stats.conversionRate) : { trend: "up", change: "0" };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Reports & Analytics" subtitle="Analyze your business performance" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Controls */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Report Configuration</CardTitle>
                  <CardDescription>
                    Configure your report parameters and export data
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Business Overview</SelectItem>
                      <SelectItem value="sales">Sales Performance</SelectItem>
                      <SelectItem value="leads">Lead Analysis</SelectItem>
                      <SelectItem value="customers">Customer Insights</SelectItem>
                      <SelectItem value="tasks">Task Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <DatePickerWithRange 
                    date={dateRange}
                    onDateChange={setDateRange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter Options</label>
                  <Button variant="outline" className="w-full justify-start">
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "—" : formatCurrency(stats?.totalRevenue || 0)}
                    </p>
                    <p className="text-sm text-success flex items-center mt-2">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% vs last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "—" : formatPercentage(stats?.conversionRate || 0)}
                    </p>
                    <p className={`text-sm flex items-center mt-2 ${
                      conversionTrend.trend === "up" ? "text-success" : "text-warning"
                    }`}>
                      {conversionTrend.trend === "up" ? 
                        <TrendingUp className="w-3 h-3 mr-1" /> : 
                        <TrendingDown className="w-3 h-3 mr-1" />
                      }
                      {conversionTrend.trend === "up" ? "+" : "-"}{conversionTrend.change}% vs last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "—" : (stats?.totalLeads || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-success flex items-center mt-2">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +8% vs last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Customers</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "—" : (stats?.totalCustomers || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-success flex items-center mt-2">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +15% vs last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Pipeline Analysis</CardTitle>
                <CardDescription>
                  Total Pipeline Value: {formatCurrency(calculatePipelineTotal())}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pipelineLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-2 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipeline?.map((stage, index) => {
                      const total = calculatePipelineTotal();
                      const percentage = total > 0 ? (stage.value / total) * 100 : 0;
                      
                      return (
                        <div key={stage.stage}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium capitalize">{stage.stage}</span>
                              <Badge variant="outline">{stage.count} deals</Badge>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(stage.value)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                index === 0 ? 'bg-primary' :
                                index === 1 ? 'bg-secondary' :
                                index === 2 ? 'bg-warning' :
                                index === 3 ? 'bg-purple-500' :
                                'bg-success'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {percentage.toFixed(1)}% of total pipeline
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Key metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Lead Generation</h4>
                      <p className="text-sm text-gray-500">Monthly new leads</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">+23%</div>
                      <div className="text-sm text-success flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Improving
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Deal Closure</h4>
                      <p className="text-sm text-gray-500">Average time to close</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">-15%</div>
                      <div className="text-sm text-success flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Faster
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Customer Retention</h4>
                      <p className="text-sm text-gray-500">Monthly retention rate</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">92%</div>
                      <div className="text-sm text-success flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Excellent
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Team Productivity</h4>
                      <p className="text-sm text-gray-500">Tasks completed per day</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">+8%</div>
                      <div className="text-sm text-success flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Growing
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>
                In-depth analysis and insights for your CRM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Advanced Analytics Coming Soon
                </h3>
                <p className="text-gray-500 mb-4">
                  Interactive charts, custom reports, and detailed insights will be available here.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Revenue Analytics</h4>
                    <p className="text-sm text-gray-600">
                      Track revenue trends, forecasting, and performance metrics
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Lead Scoring</h4>
                    <p className="text-sm text-gray-600">
                      Advanced lead scoring and conversion probability analysis
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Team Performance</h4>
                    <p className="text-sm text-gray-600">
                      Individual and team performance tracking and optimization
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
