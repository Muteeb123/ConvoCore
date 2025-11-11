import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// import { Header } from "@/components/layout/header"; // Assuming Header is not needed
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
  Calendar,
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Repeat, // Added Repeat for consistency
} from "lucide-react";
import { Opportunity, Customer } from "@shared/schema"; // Added Customer
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OpportunityModal } from "@/components/modals/opportunity-modal";
import { BulkImportModal } from "@/components/modals/bulk-import";
import { ViewOpportunityModal } from "@/components/modals/view-opportunity-modal";
import { QualifyOpportunityModal } from "@/components/modals/qualify-opportunity-modal"; // Renamed for clarity
import { useUserStore, useRoleStore } from "@/stores/useRoleStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed DateRange import if not using react-day-picker directly here
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/TableSkeleton";
// --- Constants ---
const STAGE_OPTIONS = [
  { value: "all", label: "All Stages", color: "bg-gray-100 text-gray-800" },
  {
    value: "prospecting",
    label: "Prospecting",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "proposal",
    label: "Proposal",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "negotiation",
    label: "Negotiation",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "closed_won",
    label: "Closed Won",
    color: "bg-green-100 text-green-800",
  }, // Added Closed Won
  {
    value: "closed_lost",
    label: "Closed Lost",
    color: "bg-red-100 text-red-800",
  }, // Added Closed Lost
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "new_business", label: "New Business" },
  { value: "existing_business", label: "Existing Business" },
  { value: "renewal", label: "Renewal" },
  { value: "upsell", label: "Upsell" },
];
// --- End Constants ---

export default function Opportunities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isAllowedAddOpportunity, setIsAllowedAddOpportunity] = useState(false);
  const [isAllowedDeleteOpportunity, setIsAllowedDeleteOpportunity] =
    useState(false);
  const [isAllowedEditOpportunity, setIsAllowedEditOpportunity] =
    useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isCloseOpportunityModelActive, setisCloseOpportunityModelActive] = // Consider renaming setIsClose...
    useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const limit = 25;

  // --- Filter States ---
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  // Assuming DateRangePicker component handles state, removed direct state here
  // const [closeDateRange, setCloseDateRange] = useState<DateRange | undefined>();
  // const [createdDateRange, setCreatedDateRange] = useState<DateRange | undefined>();
  const [valueRange, setValueRange] = useState<{ min?: string; max?: string }>( // Use string for input values
    {}
  );
  const [closedStatusFilter, setClosedStatusFilter] = useState<string>("all"); // Simplified status filter state
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all"); // Keep if using pipelines

  // State for stable dropdown options populated from data
  const [allAssignedUsers, setAllAssignedUsers] = useState<string[]>([]);
  const [allCreatedByUsers, setAllCreatedByUsers] = useState<string[]>([]);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);
  const [allPipelines, setAllPipelines] = useState<string[]>([]); // Keep if using pipelines

  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  // --- useQuery hook sending filters ---
  const {
    data: opportunitiesData,
    isLoading,
    isFetching,
    error, // Keep error for potential UI feedback if needed later
  } = useQuery<Opportunity[]>({
    // ✅ CHANGED: Expect Opportunity[] directly
    queryKey: [
      "/api/opportunities",
      userrole?.name,
      activeUser?.id,
      page,
      limit,
      searchTerm,
      stageFilter,
      priorityFilter,
      typeFilter,
      // closeDateRange, // Add back if using DateRangePicker and passing state
      // createdDateRange, // Add back if using DateRangePicker and passing state
      valueRange,
      closedStatusFilter,
      assignedUserFilter,
      createdByFilter,
      companyFilter,
      pipelineFilter,
    ],
    queryFn: async () => {
      if (!userrole?.name || !activeUser?.id) return []; // Return empty array if user/role missing

      const currentOffset = (page - 1) * limit;
      let url = `/api/opportunities/user/${activeUser.id}?role=${userrole.name}&limit=${limit}&offset=${currentOffset}`;

      // Append Filters (logic remains the same)
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (stageFilter !== "all")
        url += `&stage=${encodeURIComponent(stageFilter)}`;
      if (priorityFilter !== "all")
        url += `&priority=${encodeURIComponent(priorityFilter)}`;
      if (typeFilter !== "all")
        url += `&type=${encodeURIComponent(typeFilter)}`;
      if (assignedUserFilter !== "all")
        url += `&assignedUser=${encodeURIComponent(assignedUserFilter)}`;
      if (createdByFilter !== "all")
        url += `&createdBy=${encodeURIComponent(createdByFilter)}`;
      if (companyFilter !== "all")
        url += `&companyName=${encodeURIComponent(companyFilter)}`;
      if (pipelineFilter !== "all")
        url += `&pipeline=${encodeURIComponent(pipelineFilter)}`;
      if (valueRange.min) url += `&minValue=${valueRange.min}`;
      if (valueRange.max) url += `&maxValue=${valueRange.max}`;
      // Add date range params here if using DateRangePicker state
      // if (closeDateRange?.from) url += `&closeDateFrom=${closeDateRange.from.toISOString()}`;
      // if (closeDateRange?.to) url += `&closeDateTo=${closeDateRange.to.toISOString()}`;
      if (closedStatusFilter !== "all")
        url += `&closedStatus=${closedStatusFilter}`;

      try {
        const res = await apiRequest("GET", url);
        if (!res.ok) {
          const errorText = await res.text();
          console.error(
            "Failed to fetch opportunities:",
            res.status,
            errorText
          );
          throw new Error(`Failed to fetch opportunities: ${res.status}`);
        }
        const data = await res.json();
        console.log("API Response Data:", data);

        // ✅ CHANGED: Validate if it's an array
        if (!Array.isArray(data)) {
          console.error("API did not return an array:", data);
          toast({
            title: "Error fetching data",
            description: "Unexpected response from server.",
            variant: "destructive",
          });
          throw new Error("Invalid data structure from API"); // Throw error
        }
        return data; // Return the array directly
      } catch (err) {
        console.error("Error fetching opportunities:", err);
        // Avoid infinite loops by not throwing here if queryFn should return default on error
        toast({
          title: "Fetch Error",
          description:
            err instanceof Error ? err.message : "An unknown error occurred",
          variant: "destructive",
        });
        return []; // Return empty array on error
      }
    },
    enabled: !!userrole?.name && !!activeUser?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // --- Data Extraction ---
  const opportunities = opportunitiesData || [];
  // ✅ SAFER total count extraction: Check if data exists AND has length before accessing [0]
  const totalItems =
    opportunitiesData && opportunitiesData.length > 0
      ? opportunitiesData[0]?.totalcount || 0
      : 0; // Default to 0 if no data or empty array
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

  console.log(
    "Current Page:",

    page,

    "Total Items:",

    totalItems,

    "Total Pages:",

    totalPages
  ); // Log pagination state
  useEffect(() => {
    if (opportunities.length > 0) {
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

      const currentAssigned = Array.from(
        new Set(
          opportunities
            .map((o) => o.assignedUserName)
            .filter((v): v is string => !!v)
        )
      );
      const currentCreatedBy = Array.from(
        new Set(
          opportunities
            .map((o) => o.createdByUserName)
            .filter((v): v is string => !!v)
        )
      );
      const currentCompanies = Array.from(
        new Set(
          opportunities
            .map((o) => o.companyName)
            .filter((v): v is string => !!v)
        )
      );
      const currentPipelines = Array.from(
        new Set(
          opportunities.map((o) => o.pipeline).filter((v): v is string => !!v)
        )
      );

      setAllAssignedUsers((prev) => mergeOptions(prev, currentAssigned));
      setAllCreatedByUsers((prev) => mergeOptions(prev, currentCreatedBy));
      setAllCompanies((prev) => mergeOptions(prev, currentCompanies));
      setAllPipelines((prev) => mergeOptions(prev, currentPipelines));
    }
  }, [opportunities]); // Depend on the fetched opportunities

  // Reset page when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [
    searchTerm,
    stageFilter,
    priorityFilter,
    typeFilter,
    // closeDateRange,
    // createdDateRange,
    valueRange,
    closedStatusFilter,
    assignedUserFilter,
    createdByFilter,
    companyFilter,
    pipelineFilter,
  ]);

  // Permissions useEffect
  useEffect(() => {
    const permissions = userrole?.permissions || [];
    const hasAll = permissions.includes("all");
    setIsAllowedAddOpportunity(
      hasAll || permissions.includes("create_opportunities")
    );
    setIsAllowedEditOpportunity(
      hasAll || permissions.includes("edit_opportunities")
    );
    setIsAllowedDeleteOpportunity(
      hasAll || permissions.includes("delete_opportunities")
    );
  }, [userrole]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/opportunities/${id}`);
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to delete opportunity." }));
        throw new Error(errorData.message || "Failed to delete opportunity.");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/opportunities", userrole?.name, activeUser?.id],
      }); // Invalidate base query
      toast({ title: "Opportunity deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting opportunity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // --- Action Handlers ---
  const handleAddOpportunity = () => {
    setSelectedOpportunity(null);
    setIsModalOpen(true);
  };
  const handleEditOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };
  const handleBulkOpportunity = () => {
    setIsBulkImportModalOpen(true);
  };
  const handleDeleteOpportunity = async (id: number) => {
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this Opportunity?",
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

  const resetFilters = () => {
    setStageFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
    // setCloseDateRange(undefined); // Reset date pickers if used
    // setCreatedDateRange(undefined); // Reset date pickers if used
    setValueRange({});
    setClosedStatusFilter("all"); // Reset to 'all'
    setAssignedUserFilter("all");
    setCreatedByFilter("all");
    setCompanyFilter("all");
    setPipelineFilter("all");
    setSearchTerm("");
    // setPage(1); // Handled by useEffect
  };

  // --- UI Helpers ---
  const getStageColor = (stage: string | null | undefined): string => {
    // Handle null/undefined
    const option = STAGE_OPTIONS.find(
      (opt) => opt.value === stage?.toLowerCase()
    ); // Use lowercase
    return option ? option.color : "bg-gray-100 text-gray-800";
  };
  const formatDate = (dateString: string | null | Date | undefined): string => {
    // Handle null/undefined
    if (!dateString) return "—";
    try {
      const date =
        dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      console.error("Invalid Date:", dateString);
      return "Invalid Date";
    }
  };
  const formatCurrency = (
    value: number | string | null | undefined
  ): string => {
    if (value === null || value === undefined || value === "") return "—";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return numValue.toLocaleString("en-US", {
      // Simplified formatting
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Calculate active filter count
  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (stageFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (assignedUserFilter !== "all" ? 1 : 0) +
    (createdByFilter !== "all" ? 1 : 0) +
    (companyFilter !== "all" ? 1 : 0) +
    (pipelineFilter !== "all" ? 1 : 0) +
    // (closeDateRange ? 1 : 0) + // Add back if using date picker
    // (createdDateRange ? 1 : 0) + // Add back if using date picker
    (valueRange.min !== undefined || valueRange.max !== undefined ? 1 : 0) +
    (closedStatusFilter !== "all" ? 1 : 0);

  // --- Render Functions ---
  const renderLoading = () => <TableSkeleton />;

  // console.log(
  //   "Stagging: ",
  //   opportunities.map((o) => o.stage)
  // );

  // const filteredstaging = opportunities.filter(
  //   (o) => o.stage === "closed won" || o.stage === "closed lost"
  // );

  // console.log("Filtered filtered stagging: ", filteredstaging);
  const renderTableContent = () => (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Company</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Expected Close</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-gray-500">
                    {activeFilterCount > 0 || searchTerm
                      ? "No opportunities match your criteria."
                      : "No opportunities found. Add your first opportunity?"}
                  </div>
                  {(activeFilterCount > 0 || searchTerm) && (
                    <Button
                      variant="ghost"
                      onClick={resetFilters}
                      className="mt-2"
                    >
                      <Repeat className="w-4 h-4 mr-2" /> Reset Filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {opportunity.name}
                        </div>
                        {opportunity.companyName && (
                          <div className="text-sm text-gray-500">
                            {opportunity.companyName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStageColor(opportunity?.stage)}>
                      {opportunity?.stage
                        ? opportunity.stage.charAt(0).toUpperCase() +
                          opportunity.stage.slice(1)
                        : "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(opportunity.value)}
                  </TableCell>
                  <TableCell>
                    {opportunity.priority ? (
                      <Badge
                        variant={
                          opportunity.priority === "high" ||
                          opportunity.priority === "critical"
                            ? "destructive"
                            : opportunity.priority === "medium"
                            ? "secondary"
                            : "default"
                        }
                        className="capitalize"
                      >
                        {opportunity.priority}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(opportunity.expectedCloseDate)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{opportunity.assignedUserName || "—"}</TableCell>
                  <TableCell>
                    {activeUser &&
                    opportunity.createdByUserId === activeUser.id ? (
                      <Badge className="bg-green-100 text-green-800">
                        Created
                      </Badge>
                    ) : activeUser &&
                      opportunity.assignedUserId === activeUser.id ? (
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
                          setSelectedOpportunity(opportunity);
                          setIsViewModalOpen(true);
                        }}
                        className="hover:bg-gray-100 p-1"
                      >
                        <Eye className="w-4 h-4 text-gray-500 hover:text-gray-600" />
                      </Button>
                      {isAllowedEditOpportunity && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditOpportunity(opportunity)}
                          className="hover:bg-gray-100 p-1"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                      {isAllowedDeleteOpportunity && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteOpportunity(opportunity.id)
                          }
                          className="hover:bg-red-50 text-red-500 hover:text-red-600 p-1"
                          disabled={
                            !!opportunity.isClosedWon ||
                            !!opportunity.isClosedLost
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {/* {!opportunity.isClosedWon &&
                        !opportunity.isClosedLost && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setSelectedOpportunity(opportunity);
                              setisCloseOpportunityModelActive(true);
                            }}
                            className="p-1 h-auto text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Close
                          </Button>
                        )} */}

                      {!opportunity.isClosedWon && !opportunity.isClosedLost ? (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSelectedOpportunity(opportunity);
                            setisCloseOpportunityModelActive(true);
                          }}
                          className="pl-[5px] p-1 h-auto text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Close
                        </Button>
                      ) : (
                        <span
                          className={`text-xs pl-[5px] font-semibold ${
                            opportunity.stage === "closed won"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {opportunity.stage === "closed won"
                            ? "Closed Won"
                            : "Closed Lost"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Pagination Controls --- */}
      {/* Ensure totalPages is calculated correctly before this renders */}
      {totalItems > 0 && totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * limit + 1, totalItems)} to{" "}
            {Math.min(page * limit, totalItems)} of {totalItems} opportunities
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
              Prev
            </Button>
            {/* ✅ Refined Dynamic Page Numbers Logic with Guard */}
            <div className="flex items-center space-x-1">
              {(() => {
                // ✅ GUARD: Don't render page numbers if only one page
                if (totalPages <= 1) return null;

                const pageNumbers = [];
                const maxVisiblePages = 5;
                const pageBuffer = Math.floor((maxVisiblePages - 2) / 2);

                // Always show first page (it's already added outside this IIFE, we adjust logic slightly)
                // pageNumbers.push(<Button key={1} variant={page === 1 ? "default" : "outline"} size="sm" onClick={() => setPage(1)}>1</Button>);

                let startPage = Math.max(2, page - pageBuffer);
                let endPage = Math.min(totalPages - 1, page + pageBuffer);

                // Adjust range if near beginning or end with many pages
                if (totalPages > maxVisiblePages) {
                  if (page <= pageBuffer + 1) {
                    // Near start
                    endPage = maxVisiblePages - 1;
                    startPage = 2; // Ensure start is 2
                  } else if (page >= totalPages - pageBuffer) {
                    // Near end
                    startPage = totalPages - maxVisiblePages + 2;
                    endPage = totalPages - 1; // Ensure end is totalPages - 1
                  }
                } else {
                  // Less than maxVisiblePages total, show all pages between 1 and totalPages
                  startPage = 2;
                  endPage = totalPages - 1;
                }

                // Start ellipsis logic
                if (startPage > 2) {
                  // Show ellipsis if startPage is greater than 2
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

                // Add middle page numbers
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

                // End ellipsis logic
                if (endPage < totalPages - 1) {
                  // Show ellipsis if endPage is less than totalPages - 1
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
                }

                // Always show last page (if different from first page, handled by totalPages > 1 check)
                // pageNumbers.push(<Button key={totalPages} variant={page === totalPages ? "default" : "outline"} size="sm" onClick={() => setPage(totalPages)}>{totalPages}</Button>);

                return [
                  // Always render first page button
                  <Button
                    key={1}
                    variant={page === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(1)}
                  >
                    1
                  </Button>,
                  ...pageNumbers, // Render ellipsis and middle pages
                  // Always render last page button if more than 1 page
                  ...(totalPages > 1
                    ? [
                        <Button
                          key={totalPages}
                          variant={page === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(totalPages)}
                        >
                          {totalPages}
                        </Button>,
                      ]
                    : []),
                ];
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
          userName="Opportunities"
          subtitle="Track your sales opportunities"
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

        {/* 5. Scrolling Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {/* Show loading indicator OR table content */}
          {isLoading || isFetching ? (
            renderLoading()
          ) : (
            <Card className="w-full">
              <CardHeader>
                {/* Title, Description, Buttons */}
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle>All Opportunities</CardTitle>
                    <CardDescription>
                      Manage your sales opportunities
                    </CardDescription>
                  </div>
                  {isAllowedAddOpportunity && (
                    // <div className="flex items-center space-x-2">
                    <div className="hidden items-center space-x-2">
                      {" "}
                      {/* Show Add button if allowed */}
                      <Button
                        onClick={handleAddOpportunity}
                        className="bg-primary hover:bg-primary/80 h-9" // Adjusted hover, added height
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Opportunity
                      </Button>
                    </div>
                  )}
                </div>
                {/* Search and Filter Row */}
                <div className="flex flex-col space-y-4 pt-4">
                  <div className="flex items-center space-x-2">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search opportunities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    {/* Filter Button */}
                    <Button
                      variant="outline"
                      onClick={() =>
                        setShowAdvancedFilters(!showAdvancedFilters)
                      }
                      className="flex items-center h-9"
                    >
                      <Filter className="w-4 h-4 mr-2" /> Filters
                      {activeFilterCount > 0 && (
                        <Badge className="ml-2 px-2 py-0.5">
                          {activeFilterCount}
                        </Badge> // Improved badge
                      )}
                      {showAdvancedFilters ? (
                        <ChevronUp className="w-4 h-4 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                    {/* Clear Button */}
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        onClick={resetFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 h-9"
                      >
                        <X className="w-4 h-4 mr-1" /> Clear all
                      </Button>
                    )}
                  </div>
                  {/* Advanced Filters Panel */}
                  {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t items-end">
                      {" "}
                      {/* Added items-end */}
                      <div>
                        <Label>Stage</Label>
                        <Select
                          value={stageFilter}
                          onValueChange={setStageFilter}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Stages" />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={priorityFilter}
                          onValueChange={setPriorityFilter}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Priorities" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={typeFilter}
                          onValueChange={setTypeFilter}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value Range</Label>
                        <div className="flex space-x-2 mt-1">
                          <Input
                            className="h-9"
                            type="number"
                            placeholder="Min"
                            value={valueRange.min ?? ""}
                            onChange={(e) =>
                              setValueRange({
                                ...valueRange,
                                min: e.target.value || undefined, // Set to undefined if empty
                              })
                            }
                          />
                          <Input
                            className="h-9"
                            type="number"
                            placeholder="Max"
                            value={valueRange.max ?? ""}
                            onChange={(e) =>
                              setValueRange({
                                ...valueRange,
                                max: e.target.value || undefined, // Set to undefined if empty
                              })
                            }
                          />
                        </div>
                      </div>
                      {/* <div>
                        <Label>Status</Label>
                        <Select
                          value={closedStatusFilter}
                          onValueChange={setClosedStatusFilter} // Simplified handler
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closedWon">
                              Closed Won
                            </SelectItem>
                            <SelectItem value="closedLost">
                              Closed Lost
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}
                      {allAssignedUsers.length > 0 && (
                        <div>
                          <Label>Assigned To</Label>
                          <Select
                            value={assignedUserFilter}
                            onValueChange={setAssignedUserFilter}
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              {allAssignedUsers.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {allCreatedByUsers.length > 0 && (
                        <div>
                          <Label>Created By</Label>
                          <Select
                            value={createdByFilter}
                            onValueChange={setCreatedByFilter}
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              {allCreatedByUsers.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {allCompanies.length > 0 && ( // Filter by Company Name
                        <div>
                          <Label>Company</Label>
                          <Select
                            value={companyFilter}
                            onValueChange={setCompanyFilter}
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="All Companies" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Companies</SelectItem>
                              {allCompanies.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {allPipelines.length > 0 && ( // Filter by Pipeline if applicable
                        <div>
                          <Label>Pipeline</Label>
                          <Select
                            value={pipelineFilter}
                            onValueChange={setPipelineFilter}
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="All Pipelines" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Pipelines</SelectItem>
                              <SelectItem value="none">None</SelectItem>{" "}
                              {/* Option for no pipeline */}
                              {allPipelines.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Add Date Range Pickers here if needed */}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Render table content */}
                {renderTableContent()}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      {/* Modals */}
      <OpportunityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        opportunity={selectedOpportunity}
      />
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        bulkImportName="opportunity" // Changed to opportunity
      />
      <ViewOpportunityModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        opportunity={selectedOpportunity}
      />
      <QualifyOpportunityModal // Use the renamed component
        isOpen={isCloseOpportunityModelActive}
        onClose={() => setisCloseOpportunityModelActive(false)}
        opportunity={selectedOpportunity}
      />
    </div>
  );
}
