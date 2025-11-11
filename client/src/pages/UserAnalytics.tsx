import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, TrendingUp, Users, Briefcase, CheckCircle, Target, X, Shield, Star, UserCog, Crown } from "lucide-react";
import { useUserStore } from "@/stores/useRoleStore";
import { Button } from "@/components/ui/button";
import { FALLBACK_URL } from "@/constants/data";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";

interface UserAnalytics {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  userType: string;
  totalLeadsCreated: number;
  totalLeadsAssigned: number;
  totalTasksAssigned: number;
  opportunitiesCreated: number;
  opportunitiesAssigned: number;
  customerAssigned: number;
  tasksAssigned: number;
  tasksCreated: number;
}
const getRoleBadge = (userType: string) => {
  console.log("UserType", userType);

  const badges = {
    admin: {
      label: "Admin",
      icon: Crown,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      iconColor: "text-red-600",
    },
    manager: {
      label: "Manager",
      icon: Shield,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      iconColor: "text-purple-600",
    },
    "team-lead": {
      label: "Team Lead",
      icon: Star,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      iconColor: "text-blue-600",
    },
    associate: {
      label: "Associate",
      icon: UserCog,
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      iconColor: "text-gray-600",
    },
  };

  return badges[userType as keyof typeof badges] || badges.associate;
};

const UserAnalyticsTable: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
  const [page, setPage] = useState(1);
  const limit = 25;
  const offset = (page - 1) * limit;
  const activeUser = useUserStore((state) => state.user);
  const fallbackUrl = FALLBACK_URL;

  const { data, isLoading, error } = useQuery({
    queryKey: ["userAnalytics", page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/users?limit=${limit}&offset=${offset}`);
      const result = await response.json();
      console.log("Fetched User Analytics:", result);
      return result;
    },
  });

  const users = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
        <p className="text-red-500">Failed to load user analytics</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#5A7FFF] to-[#4169E1]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">User Performance Analytics</h2>
              <p className="text-sm text-white/80 mt-1">Track individual user activity and performance</p>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-lg">
              <p className="text-white font-semibold">{totalCount} Users</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Leads Created
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Leads Assigned
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Tasks Assigned
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {users?.map((user: UserAnalytics) => {
                const roleBadge = getRoleBadge(user.userType);

                return (
                  <tr
                    key={user.userId}
                    className="hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 rounded-full overflow-hidden">
                          <AvatarImage src={user.avatar ? user.avatar : fallbackUrl} alt='avatar' className="w-full h-full object-cover" />
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#1E293B]">
                              {user.firstName} {user.lastName}
                            </p>
                            {/* ✅ Role Badge - Shows each user's actual role */}
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${roleBadge.bgColor}`}>
                              <roleBadge.icon className={`w-3 h-3 ${roleBadge.iconColor}`} />
                              <span className={`text-xs font-medium ${roleBadge.textColor}`}>
                                {roleBadge.label}
                                {/* hellloooo */}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-[#64748B]">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-700">{user.totalLeadsCreated}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                        <Target className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-700">{user.totalLeadsAssigned}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-700">{user.totalTasksAssigned}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7FFF] text-white rounded-lg hover:bg-[#4169E1] transition-all shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">View Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users?.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-[#CBD5E1] mb-4" />
            <p className="text-[#64748B] text-lg">No user analytics data available</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="mt-4 px-6 py-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 border-t border-[#E2E8F0]">
            <div className="text-sm text-gray-500">
              Showing {Math.min((page - 1) * limit + 1, totalCount)} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount} users
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              {/* Dynamic Page Numbers */}
              <div className="flex items-center space-x-1">
                {(() => {
                  const pageNumbers = [];
                  const maxPagesToShow = 5;
                  const halfMaxPages = Math.floor(maxPagesToShow / 2);
                  let startPage = Math.max(1, page - halfMaxPages);
                  let endPage = Math.min(totalPages, page + halfMaxPages);
                  if (page <= halfMaxPages + 1)
                    endPage = Math.min(totalPages, maxPagesToShow);
                  if (page >= totalPages - halfMaxPages)
                    startPage = Math.max(1, totalPages - maxPagesToShow + 1);

                  if (startPage > 1) {
                    pageNumbers.push(
                      <Button
                        key={1}
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(1)}
                      >
                        1
                      </Button>
                    );
                    if (startPage > 2)
                      pageNumbers.push(
                        <Button
                          key="start-ellipsis"
                          variant="ghost"
                          size="sm"
                          disabled
                          className="px-2"
                        >
                          ...
                        </Button>
                      );
                  }
                  for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(
                      <Button
                        key={i}
                        variant={page === i ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(i)}
                      >
                        {i}
                      </Button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1)
                      pageNumbers.push(
                        <Button
                          key="end-ellipsis"
                          variant="ghost"
                          size="sm"
                          disabled
                          className="px-2"
                        >
                          ...
                        </Button>
                      );
                    pageNumbers.push(
                      <Button
                        key={totalPages}
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    );
                  }
                  return pageNumbers;
                })()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
};

// Modal Component
interface UserDetailsModalProps {
  user: UserAnalytics;
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
  const roleBadge = getRoleBadge(user.userType);

  const stats = [
    {
      label: "Leads Created",
      value: user.totalLeadsCreated,
      icon: TrendingUp,
      color: "blue",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      iconColor: "text-blue-600",
    },
    {
      label: "Leads Assigned",
      value: user.totalLeadsAssigned,
      icon: Target,
      color: "purple",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      iconColor: "text-purple-600",
    },
    {
      label: "Opportunities Created",
      value: user.opportunitiesCreated,
      icon: Briefcase,
      color: "orange",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      iconColor: "text-orange-600",
    },
    {
      label: "Opportunities Assigned",
      value: user.opportunitiesAssigned,
      icon: Briefcase,
      color: "pink",
      bgColor: "bg-pink-50",
      textColor: "text-pink-700",
      iconColor: "text-pink-600",
    },
    {
      label: "Customers Assigned",
      value: user.customerAssigned,
      icon: Users,
      color: "teal",
      bgColor: "bg-teal-50",
      textColor: "text-teal-700",
      iconColor: "text-teal-600",
    },
    {
      label: "Tasks Created",
      value: user.tasksCreated,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      iconColor: "text-green-600",
    },
    {
      label: "Tasks Assigned",
      value: user.tasksAssigned,
      icon: CheckCircle,
      color: "emerald",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#5A7FFF] to-[#4169E1] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#5A7FFF] font-bold text-xl shadow-lg">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-white/80">@{user.username}</p>
              </div>
            </div>

            {/* ✅ Right Side: Role Badge and Close Button */}
            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${roleBadge.bgColor} border-2 border-white shadow-md`}>
                <roleBadge.icon className={`w-5 h-5 ${roleBadge.iconColor}`} />
                <span className={`text-sm font-semibold ${roleBadge.textColor}`}>
                  {roleBadge.label}
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <h3 className="text-lg font-semibold text-[#1E293B] mb-4">Performance Overview</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`${stat.bgColor} rounded-xl p-4 border border-${stat.color}-200 hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-white`}>
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <span className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#64748B]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#F0F4FF] to-[#E0E7FF] rounded-xl border border-[#C7D2FE]">
            <h4 className="font-semibold text-[#1E293B] mb-2">Total Activity</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[#64748B]">Total Created</p>
                <p className="text-xl font-bold text-[#5A7FFF]">
                  {user.totalLeadsCreated + user.opportunitiesCreated + user.tasksCreated}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total Assigned</p>
                <p className="text-xl font-bold text-[#5A7FFF]">
                  {user.totalLeadsAssigned + user.opportunitiesAssigned + user.tasksAssigned + user.customerAssigned}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Lead Activity</p>
                <p className="text-xl font-bold text-[#5A7FFF]">
                  {user.totalLeadsCreated + user.totalLeadsAssigned}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Task Activity</p>
                <p className="text-xl font-bold text-[#5A7FFF]">
                  {user.tasksCreated + user.tasksAssigned}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#5A7FFF] text-white rounded-lg hover:bg-[#4169E1] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAnalyticsTable;