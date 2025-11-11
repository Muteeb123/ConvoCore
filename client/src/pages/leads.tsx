import { useEffect, useState, useMemo } from "react"; // Keep useMemo
import { useQuery, useMutation } from "@tanstack/react-query";
// import { Sidebar } from "@/components/layout/sidebar";
// import { Header } from "@/components/layout/header"; // Assuming Header is not needed if DashboardHeader is used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Repeat,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Lead, Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LeadModal } from "@/components/modals/lead-modal";
import { useBadgeStore } from "@/stores/useBadgeStore";
import { BulkImportModal } from "@/components/modals/bulk-import";
import { LeadViewModal } from "@/components/modals/view-lead-model";
import { QualifyLeadModal } from "@/components/modals/qualify-lead-modal";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2"; // Assuming sidebarv-2 is correct
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
import { TableSkeleton } from "@/components/TableSkeleton";
// Define filter types
type LeadStatus = "new" | "qualified" | "converted" | "lost";
type ValueRange = [number, number];
type ProbabilityRange = [number, number];

interface Filters {
  status: LeadStatus | "all";
  source: string; // "all" will be the default
  tags: string[];
  valueRange: ValueRange;
  probabilityRange: ProbabilityRange;
  assignedUser: string; // "all" will be the default
  createdBy: string; // "all" will be the default
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const { setBadge } = useBadgeStore();
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [qualifyModalLead, setQualifyModalLead] = useState<Lead | null>(null);
  const [isQualifyModalOpen, setIsQualifyModalOpen] = useState(false);
  const [allTagOptions, setAllTagOptions] = useState<string[]>([]);
  const [allAssignedUserOptions, setAllAssignedUserOptions] = useState<
    string[]
  >([]);
  const [allCreatorOptions, setAllCreatorOptions] = useState<string[]>([]);
  const [isAllowedAddLead, setIsAllowedAddLead] = useState(false);
  const [isAllowedDeleteLead, setIsAllowedDeleteLead] = useState(false);
  const [isAllowedEditLead, setIsAllowedEditLead] = useState(false);
  const [isAllowedQualifyLead, setIsAllowedQualifyLead] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  // const [allSourceOptions, setAllSourceOptions] = useState<string[]>([]);
  const isLeadRsp = (lead: Lead) => !!lead.rsp;
  const [rspPermissions, setRspPermissions] = useState({
    canViewRsp: false,
    canEditRsp: false,
    canDeleteRsp: false,
    canCreateRsp: false,
  });
  const [page, setPage] = useState(1);
  const limit = 25; // Items per page
  const offset = (page - 1) * limit; // Calculate offset for API

  const [filters, setFilters] = useState<Filters>({
    status: "all",
    source: "all",
    tags: [],
    valueRange: [0, 100000],
    probabilityRange: [0, 100],
    assignedUser: "all",
    createdBy: "all",
    dateRange: {
      start: null,
      end: null,
    },
  });

  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);
  const leadSources = [
    "website",
    "referral",
    "social_media",
    "email_campaign",
    "cold_call",
    "trade_show",
    "other",
  ];

  const {
    data: leadsData,
    isLoading,
    isFetching, // Keep isFetching if you want loading indicator during background refetches
    refetch,
  } = useQuery<{ result: Lead[]; totalcount: number }>({
    // Assuming API returns this structure
    queryKey: [
      "/api/leads",
      activeUser?.id,
      userrole?.name,
      page,
      limit,
      filters,
      searchTerm,
    ],
    queryFn: async () => {
      if (!activeUser?.id || !userrole?.name)
        return { result: [], totalcount: 0 };

      let endpoint = `/api/leads/user/${activeUser.id}?role=${userrole.name}&limit=${limit}&offset=${offset}`;

      if (searchTerm) {
        endpoint += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (filters.status !== "all") {
        endpoint += `&status=${encodeURIComponent(filters.status)}`;
      }
      if (filters.source !== "all") {
        endpoint += `&source=${encodeURIComponent(filters.source)}`;
      }
      if (filters.tags.length > 0) {
        endpoint += `&tags=${encodeURIComponent(filters.tags.join(","))}`;
      }
      if (filters.valueRange[0] !== 0) {
        endpoint += `&minValue=${filters.valueRange[0]}`;
      }
      if (filters.valueRange[1] !== 100000) {
        endpoint += `&maxValue=${filters.valueRange[1]}`;
      }
      if (filters.probabilityRange[0] !== 0) {
        endpoint += `&minProbability=${filters.probabilityRange[0]}`;
      }
      if (filters.probabilityRange[1] !== 100) {
        endpoint += `&maxProbability=${filters.probabilityRange[1]}`;
      }
      if (filters.assignedUser !== "all") {
        endpoint += `&assignedUser=${encodeURIComponent(filters.assignedUser)}`;
      }
      if (filters.createdBy !== "all") {
        endpoint += `&createdBy=${encodeURIComponent(filters.createdBy)}`;
      }
      if (filters.dateRange.start) {
        endpoint += `&startDate=${filters.dateRange.start.toISOString()}`;
      }
      if (filters.dateRange.end) {
        endpoint += `&endDate=${filters.dateRange.end.toISOString()}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch leads");

      // IMPORTANT: Adjust based on your actual API response structure
      const data = await res.json();
      // If API returns { result: [], totalcount: number }
      if (
        data &&
        typeof data.totalcount === "number" &&
        Array.isArray(data.result)
      ) {
        return data;
      }
      // If API returns Lead[] and totalcount is on the first item (adjust if needed)
      if (Array.isArray(data)) {
        return { result: data, totalcount: data[0]?.totalcount || 0 };
      }
      // Handle unexpected structure
      console.error("Unexpected API response structure for leads:", data);
      throw new Error("Invalid data structure from API");
    },
    enabled: !!activeUser?.id && !!userrole?.name,
  });

  // Adjust data extraction based on the expected API structure
  const leads: Lead[] = leadsData?.result || [];
  const totalLeads = leadsData?.totalcount || 0;

  useEffect(() => {
    if (leads && Array.isArray(leads) && leads.length > 0) {
      const getUniqueStrings = (key: keyof Lead) => {
        return Array.from(
          new Set(
            leads
              .map((lead) => lead[key])
              .filter(
                (v): v is string => typeof v === "string" && v.trim() !== ""
              )
          )
        );
      };

      const currentTags = Array.from(
        new Set(leads.flatMap((lead) => lead.tags || []).filter(Boolean))
      );

      const currentCreators = getUniqueStrings("createdByUserName");
      const currentAssigned = getUniqueStrings("assignedUserName");
      // const currentSources = getUniqueStrings("source");

      const mergeOptions = (prevOptions: string[], newOptions: string[]) => {
        const combined = new Set<string>([...prevOptions, ...newOptions]);
        const newArray = Array.from(combined).sort();
        if (
          JSON.stringify(newArray) !==
          JSON.stringify(prevOptions.slice().sort())
        ) {
          return newArray;
        }
        return prevOptions;
      };

      setAllCreatorOptions((prev) => mergeOptions(prev, currentCreators));
      setAllAssignedUserOptions((prev) => mergeOptions(prev, currentAssigned));
      // setAllSourceOptions((prev) => mergeOptions(prev, currentSources));
      setAllTagOptions((prev) => mergeOptions(prev, currentTags));
    }
  }, [leads]);

  const totalPages = Math.ceil(totalLeads / limit);

  useEffect(() => {
    // Reset page to 1 only if it's not already 1
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters]); // Depend on the filters object directly

  const { data: rawCustomers } = useQuery<{
    result: Customer[];
    totalcount: number;
  }>({
    queryKey: ["/api/customers"], // Consider if this needs user/role context
  });
  const customers = rawCustomers?.result || [];

  const statusOptions: (LeadStatus | "all")[] = [
    "all",
    "new",
    "qualified",
    "converted",
    "lost",
  ]; // Include "all"

  useEffect(() => {
    if (!userrole) return;

    setRspPermissions({
      canViewRsp:
        (userrole?.permissions?.includes("all") ||
          userrole?.permissions?.includes("view_rsp")) ??
        false,
      canEditRsp:
        (userrole?.permissions?.includes("all") ||
          userrole?.permissions?.includes("edit_rsp")) ??
        false,
      canDeleteRsp:
        (userrole?.permissions?.includes("all") ||
          userrole?.permissions?.includes("delete_rsp")) ??
        false,
      canCreateRsp:
        (userrole?.permissions?.includes("all") ||
          userrole?.permissions?.includes("create_rsp")) ??
        false,
    });
  }, [userrole]);

  // Removed redundant refetch useEffect

  useEffect(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.source !== "all") count++;
    if (filters.tags.length > 0) count++;
    if (filters.valueRange[0] !== 0 || filters.valueRange[1] !== 100000)
      count++;
    if (
      filters.probabilityRange[0] !== 0 ||
      filters.probabilityRange[1] !== 100
    )
      count++;
    if (filters.assignedUser !== "all") count++;
    if (filters.createdBy !== "all") count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (searchTerm) count++; // Count search term as an active filter

    setActiveFilters(count);
  }, [filters, searchTerm]); // Added searchTerm dependency

  useEffect(() => {
    const permissions = userrole?.permissions || [];
    const hasAll = permissions.includes("all");

    setIsAllowedAddLead(hasAll || permissions.includes("create_leads"));
    setIsAllowedDeleteLead(hasAll || permissions.includes("delete_leads"));
    setIsAllowedEditLead(hasAll || permissions.includes("edit_leads"));
    setIsAllowedQualifyLead(hasAll || permissions.includes("qualify_leads"));
  }, [userrole]);

  console.log({ isAllowedQualifyLead })
  const handleConvertion = (lead: Lead) => {
    setQualifyModalLead(lead);
    setIsQualifyModalOpen(true);
  };

  // Helper function to render Qualify button
  const renderQualifyButton = (lead: Lead, context: string = "") => {
    if (!isAllowedQualifyLead) {
      console.log(`Qualify button hidden${context ? ` (${context})` : ""}: permission denied`, { leadId: lead.id, leadName: lead.name });
      return null;
    }
    const status = (lead.status || "").toLowerCase();
    const excludedStatuses = ["qualified", "converted", "lost"];
    if (excludedStatuses.includes(status)) {
      return (
        <p className="text-sm italic text-gray-400">{status.charAt(0).toUpperCase() + status.slice(1)}</p>)
    }
    //  else if (excludedStatuses.includes(status)) {
    //   console.log(`Qualify button hidden${context ? ` (${context})` : ""}: excluded status`, { leadId: lead.id, leadName: lead.name, status });
    //   return null;
    // }

    console.log(`Qualify button should show${context ? ` (${context})` : ""}`, { leadId: lead.id, leadName: lead.name, status, isAllowedQualifyLead });
    return (
      <Button
        variant="link"
        size="sm"
        onClick={() => handleConvertion(lead)}
        className="p-1 h-auto text-blue-600 hover:text-blue-700 font-medium"
      >
        Qualify
      </Button>
    );
  };

  useEffect(() => {
    setBadge("leads", totalLeads); // Use totalLeads for badge count
  }, [totalLeads, setBadge]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Pass activeUser.id if required by API for permission checks
      const deleteUrl = `/api/leads?ids=${id}${activeUser?.id ? `,${activeUser.id}` : ""
        }`;
      const res = await apiRequest("DELETE", deleteUrl);
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to delete lead." }));
        throw new Error(errorData.message || "Failed to delete lead.");
      }
      // Return something or nothing, depending on what you need onSuccess
      return true;
    },
    onSuccess: () => {
      // Invalidate the specific page query to refetch data
      queryClient.invalidateQueries({
        queryKey: [
          "/api/leads",
          activeUser?.id,
          userrole?.name,
          page, // Include page in invalidation if you want just the current page to refresh
          limit,
          filters,
          searchTerm,
        ],
      });
      // Optionally invalidate the base key to refetch potentially other related queries
      // queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead deleted",
        description: "The lead has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead.",
        variant: "destructive",
      });
    },
  });

  const resetFilters = () => {
    setFilters({
      status: "all",
      source: "all",
      tags: [],
      valueRange: [0, 100000],
      probabilityRange: [0, 100],
      assignedUser: "all",
      createdBy: "all",
      dateRange: { start: null, end: null },
    });
    setSearchTerm("");
    // setPage(1); // Page reset is handled by useEffect
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleBulkLead = () => {
    setIsBulkImportModalOpen(true);
  };

  const handleDeleteLead = async (id: number) => {
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this lead?",
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            await deleteMutation.mutateAsync(id);
          }}
        >
          Delete
        </Button>
      ),
    });
  };

  const getStatusColor = (status: string | null | undefined): string => {
    // Added null/undefined check
    switch (
    status?.toLowerCase() // Use lowerCase for safety
    ) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "qualified":
        return "bg-yellow-100 text-yellow-800";
      case "converted":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderLoading = () => <TableSkeleton />;

  const renderTableContent = () => (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Probability</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-gray-500">
                    {searchTerm || activeFilters > 0
                      ? "No leads match your criteria. Try adjusting your filters."
                      : "No leads found. Add your first lead to get started."}
                  </div>
                  {(searchTerm || activeFilters > 0) && (
                    <Button
                      variant="ghost"
                      onClick={resetFilters}
                      className="mt-2"
                    >
                      <Repeat className="w-4 h-4 mr-2" />
                      Reset filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{lead.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.companyName || "—"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead?.status)}>
                      {lead?.status
                        ? lead.status.charAt(0).toUpperCase() +
                        lead.status.slice(1)
                        : "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.value
                      ? `$${(typeof lead.value === "string"
                        ? parseFloat(lead.value)
                        : lead.value
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}` // Format without decimals
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-10 text-right pr-1">
                        {" "}
                        {/* Adjusted width/padding */}
                        {typeof lead.probability === "string"
                          ? parseFloat(lead.probability) || 0
                          : lead.probability || 0}
                        %
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${typeof lead.probability === "string"
                              ? parseFloat(lead.probability) || 0
                              : lead.probability || 0
                              }%`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{lead.source ? lead.source
                    .split("_")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" ") : "—"}</TableCell>
                  <TableCell>
                    {/* Ensure activeUser.id exists before comparison */}
                    {activeUser && lead.createdByUserId === activeUser.id ? (
                      <Badge className="bg-green-100 text-green-800">
                        Created
                      </Badge>
                    ) : activeUser && lead.assignedUserId === activeUser.id ? (
                      <Badge className="bg-purple-100 text-purple-800">
                        Assigned
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">Other</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsViewModalOpen(true);
                        }}
                        className="p-1" // Reduced padding
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </Button>
                      {" "}
                      {/* Reduced space */}
                      {isLeadRsp(lead) ? ( // Check if lead is RSP type
                        <>
                          {(() => {
                            console.log("Lead is RSP", { leadId: lead.id, leadName: lead.name, isRsp: lead.rsp, isAllowedQualifyLead });
                            return null;
                          })()}
                          {rspPermissions.canEditRsp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLead(lead)}
                              className="p-1 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                          )}
                          {rspPermissions.canDeleteRsp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                              disabled={
                                lead.status?.toLowerCase() === "qualified"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {renderQualifyButton(lead, "RSP")}
                        </>
                      ) : (
                        // Standard lead actions
                        <>
                          {(() => {
                            console.log("Lead is NOT RSP", { leadId: lead.id, leadName: lead.name, isRsp: lead.rsp, isAllowedQualifyLead, status: lead.status });
                            return null;
                          })()}
                          {isAllowedEditLead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLead(lead)}
                              className="p-1 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                          )}
                          {isAllowedDeleteLead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                              disabled={
                                lead.status?.toLowerCase() === "qualified"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {renderQualifyButton(lead)}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalLeads > 0 && totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * limit + 1, totalLeads)} to{" "}
            {Math.min(page * limit, totalLeads)} of {totalLeads} leads
          </div>
          <div className="flex items-center space-x-1">
            {" "}
            {/* Reduced space */}
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
              {" "}
              {/* Reduced space */}
              {(() => {
                // ... (existing pagination number logic)
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
                    ); // Added padding
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
                    ); // Added padding
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
    </>
  );

  // --- Main Return ---
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
          userName="Leads"
          subtitle="Manage your leads and prospects"
          issearch={false}
        />

        {/* Mobile Sidebar Trigger */}
        {!isSidebarOpen && (
          <div className="absolute top-[65px] left-4 z-50 md:hidden">
            <SidebarTrigger
              className="p-2 rounded-md text-primary-text hover:bg-gray-200 transition"
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        )}

        {/* ✅ 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {/* ✅ ADDED isLoading Check HERE */}
          {isLoading || isFetching ? ( // Show loading indicator also during refetch
            renderLoading()
          ) : (
            <Card className="w-full">
              <CardHeader>
                {/* Title, Description, Buttons */}
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle>All Leads</CardTitle>
                    <CardDescription>
                      Track and manage your sales leads
                    </CardDescription>
                  </div>
                  {isAllowedAddLead && (
                    <div className="flex items-center space-x-2">
                      {/* <Button
                        onClick={handleAddLead}
                        className="bg-primary hover:bg-primary/80 h-9" // Adjusted hover color
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lead
                      </Button> */}
                      <RoundedPrimaryButton
                        title="Add Lead"
                        onClick={handleAddLead}
                        icon={<Plus className="w-4 h-4 mr-2" />}
                        iconAlt="Add"
                      />
                    </div>
                  )}
                </div>
                {/* Search and Filter Row */}
                <div className="flex flex-col space-y-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 h-9"
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {activeFilters > 0 && (
                        <Badge className="ml-2 px-2 py-0.5">
                          {activeFilters}
                        </Badge>
                      )}
                      {showFilters ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                    {activeFilters > 0 && (
                      <Button
                        variant="ghost"
                        onClick={resetFilters}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 h-9"
                      >
                        <X className="w-4 h-4" />
                        Clear all
                      </Button>
                    )}
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t items-end">
                      {/* Status Filter */}
                      <div>
                        <Label htmlFor="status-filter">Status</Label>
                        <Select
                          value={filters.status}
                          onValueChange={(value) =>
                            setFilters({
                              ...filters,
                              status: value as LeadStatus | "all",
                            })
                          }
                        >
                          <SelectTrigger
                            id="status-filter"
                            className="w-full h-9 mt-1"
                          >
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {statusOptions
                              .filter((s) => s !== "all")
                              .map(
                                (
                                  status // Filter out 'all' from options map
                                ) => (
                                  <SelectItem key={status} value={status}>
                                    {status.charAt(0).toUpperCase() +
                                      status.slice(1)}
                                  </SelectItem>
                                )
                              )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Source Filter */}
                      <div>
                        <Label htmlFor="source-filter">Source</Label>
                        <Select
                          value={filters.source}
                          onValueChange={(value) =>
                            setFilters({ ...filters, source: value })
                          }
                        >
                          <SelectTrigger
                            id="source-filter"
                            className="w-full h-9 mt-1"
                          >
                            <SelectValue placeholder="All sources" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All sources</SelectItem>
                            {leadSources.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source
                                  .split("_")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                  )
                                  .join(" ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tags Filter */}
                      <div>
                        <Label>Tags</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start h-9 mt-1 font-normal"
                            >
                              {filters.tags.length > 0
                                ? `${filters.tags.length} selected`
                                : "All tags"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-0" align="start">
                            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                              {allTagOptions.length > 0 ? (
                                allTagOptions.map((tag) => (
                                  <div
                                    key={tag}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      id={`tag-${tag}`}
                                      checked={filters.tags.includes(tag)}
                                      onCheckedChange={(checked) => {
                                        setFilters({
                                          ...filters,
                                          tags: checked
                                            ? [...filters.tags, tag]
                                            : filters.tags.filter(
                                              (t) => t !== tag
                                            ),
                                        });
                                      }}
                                    />
                                    <Label
                                      htmlFor={`tag-${tag}`}
                                      className="font-normal"
                                    >
                                      {tag}
                                    </Label>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">
                                  No tags available
                                </p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Value Range Filter */}
                      <div>
                        <Label>Deal Value Range</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="min-value"
                            type="number"
                            placeholder="Min"
                            value={filters.valueRange[0]}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setFilters({
                                ...filters,
                                valueRange: [
                                  value,
                                  Math.max(value, filters.valueRange[1]),
                                ],
                              });
                            }}
                            className="h-9"
                          />
                          <Input
                            id="max-value"
                            type="number"
                            placeholder="Max"
                            value={filters.valueRange[1]}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 100000;
                              setFilters({
                                ...filters,
                                valueRange: [
                                  filters.valueRange[0],
                                  Math.max(value, filters.valueRange[0]),
                                ],
                              });
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Probability Range Filter */}
                      <div>
                        <Label>Probability Range (%)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="min-probability"
                            type="number"
                            placeholder="Min %"
                            min="0"
                            max="100"
                            value={filters.probabilityRange[0]}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setFilters({
                                ...filters,
                                probabilityRange: [
                                  value,
                                  Math.max(value, filters.probabilityRange[1]),
                                ],
                              });
                            }}
                            className="h-9"
                          />
                          <Input
                            id="max-probability"
                            type="number"
                            placeholder="Max %"
                            min="0"
                            max="100"
                            value={filters.probabilityRange[1]}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 100;
                              setFilters({
                                ...filters,
                                probabilityRange: [
                                  filters.probabilityRange[0],
                                  Math.max(value, filters.probabilityRange[0]),
                                ],
                              });
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Assigned User Filter */}
                      {allAssignedUserOptions.length > 0 && (
                        <div>
                          <Label htmlFor="assigned-filter">Assigned To</Label>
                          <Select
                            value={filters.assignedUser}
                            onValueChange={(value) =>
                              setFilters({ ...filters, assignedUser: value })
                            }
                          >
                            <SelectTrigger
                              id="assigned-filter"
                              className="w-full h-9 mt-1"
                            >
                              <SelectValue placeholder="All users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All users</SelectItem>
                              {allAssignedUserOptions.map((user) => (
                                <SelectItem key={user} value={user}>
                                  {user}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Created By Filter */}
                      {allCreatorOptions.length > 0 && (
                        <div>
                          <Label htmlFor="created-filter">Created By</Label>
                          <Select
                            value={filters.createdBy}
                            onValueChange={(value) =>
                              setFilters({ ...filters, createdBy: value })
                            }
                          >
                            <SelectTrigger
                              id="created-filter"
                              className="w-full h-9 mt-1"
                            >
                              <SelectValue placeholder="All creators" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All creators</SelectItem>
                              {allCreatorOptions.map((user) => (
                                <SelectItem key={user} value={user}>
                                  {user}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* TODO: Add Date Range Picker if needed */}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Render table content */}
                {renderTableContent()}
              </CardContent>
            </Card>
          )}{" "}
          {/* End isLoading/isFetching Check */}
        </main>
      </div>
      {/* Modals */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lead={selectedLead}
      />
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        bulkImportName="leads"
      />
      <LeadViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        lead={selectedLead}
      />
      <QualifyLeadModal
        isOpen={isQualifyModalOpen}
        onClose={() => setIsQualifyModalOpen(false)}
        lead={qualifyModalLead}
      />
    </div>
  );
}
