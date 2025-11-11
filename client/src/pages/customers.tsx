import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2";
import { DashboardHeader } from "@/components/dashboardv-2/dashboard_header";
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
  Mail,
  Phone,
  Globe,
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Repeat,
} from "lucide-react";
import { Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CustomerModal } from "@/components/modals/customer-modal";
import { CustomersImportModal } from "@/components/modals/customers-bulk-import";
import { useUserStore, useRoleStore } from "@/stores/useRoleStore";
import { CustomerViewModel } from "@/components/modals/customer-view-model";
import { ViewCustomerAssociationModal } from "@/components/modals/view-customer-associations";
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
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";
// --- Filter Types --- (Keep interface for state management)
interface Filters {
  status: string;
  industry: string;
  country: string;
  timeZone: string;
  lifecycleStage: string;
  employeeRange: [number, number];
  revenueRange: [number, number];
  assignedUser: string;
  createdBy: string;
  hasWebsite: boolean | null;
  hasEmail: boolean | null;
}

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModelOpen, setIsImportModelOpen] = useState(false);
  const [ViewCustomerModelOpen, setViewCustomerModelOpen] = useState(false);
  const [isAllowedAddCustomer, setIsAllowedAddCustomer] = useState(false);
  const [isAllowedEditCustomer, setIsAllowedEditCustomer] = useState(false);
  const [isAllowedDeleteCustomer, setIsAllowedDeleteCustomer] = useState(false);
  const [SeeCustomerAssociatedThngs, setSeeCustomerAssociatedThngs] =
    useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0); // Renamed state
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const limit = 25;

  const [allCreatorOptions, setAllCreatorOptions] = useState<string[]>([]);
  const [allAssignedUserOptions, setAllAssignedUserOptions] = useState<
    string[]
  >([]);
  const [allIndustryOptions, setAllIndustryOptions] = useState<string[]>([]);
  const [allCountryOptions, setAllCountryOptions] = useState<string[]>([]);
  const [allTimeZoneOptions, setAllTimeZoneOptions] = useState<string[]>([]);
  const [allLifecycleStageOptions, setAllLifecycleStageOptions] = useState<
    string[]
  >([]);
  const fallbackUrl = FALLBACK_URL;


  // Initialize filters
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    industry: "all",
    country: "all",
    timeZone: "all",
    lifecycleStage: "all",
    employeeRange: [0, 10000], // Default range
    revenueRange: [0, 1000000000], // Default range
    assignedUser: "all",
    createdBy: "all",
    hasWebsite: null,
    hasEmail: null,
  });

  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  // --- 👇 UPDATED useQuery hook 👇 ---
  const {
    data: customerData,
    isLoading,
    isFetching,
  } = useQuery<{
    result: Customer[];
    totalcount: number;
  }>({
    queryKey: [
      // Add all filters to queryKey
      "/api/customers",
      page,
      limit,
      activeUser?.id,
      userrole?.name,
      filters, // Include the entire filters object
      searchTerm,
    ],
    queryFn: async () => {
      if (!activeUser?.id || !userrole?.name)
        return { result: [], totalcount: 0 };

      const currentOffset = (page - 1) * limit;
      let url = `/api/customers/user/${activeUser.id}?role=${userrole.name}&limit=${limit}&offset=${currentOffset}`;
  
      // Append Filters
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status !== "all")
        url += `&status=${encodeURIComponent(filters.status)}`;
      if (filters.industry !== "all")
        url += `&industry=${encodeURIComponent(filters.industry)}`;
      if (filters.country !== "all")
        url += `&country=${encodeURIComponent(filters.country)}`;
      if (filters.timeZone !== "all")
        url += `&timeZone=${encodeURIComponent(filters.timeZone)}`;
      if (filters.lifecycleStage !== "all")
        url += `&lifecycleStage=${encodeURIComponent(filters.lifecycleStage)}`;
      if (filters.assignedUser !== "all")
        url += `&assignedUser=${encodeURIComponent(filters.assignedUser)}`;
      if (filters.createdBy !== "all")
        url += `&createdBy=${encodeURIComponent(filters.createdBy)}`;

      // Append Range Filters (only if not default)
      // Check for > 0 min and < default max before sending
      if (filters.employeeRange[0] > 0)
        url += `&minEmployees=${filters.employeeRange[0]}`;
      if (filters.employeeRange[1] < 10000)
        url += `&maxEmployees=${filters.employeeRange[1]}`;
      if (filters.revenueRange[0] > 0)
        url += `&minRevenue=${filters.revenueRange[0]}`;
      if (filters.revenueRange[1] < 1000000000)
        url += `&maxRevenue=${filters.revenueRange[1]}`;

      // Append Boolean Filters (only if not null)
      if (filters.hasWebsite !== null)
        url += `&hasWebsite=${filters.hasWebsite}`;
      if (filters.hasEmail !== null) url += `&hasEmail=${filters.hasEmail}`;

      console.log("Fetching Customers URL:", url); // Log the final URL
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        console.error(
          "Failed to fetch customers:",
          res.status,
          await res.text()
        );
        throw new Error("Failed to fetch customers");
      }
      return res.json();
    },
    enabled: !!activeUser?.id && !!userrole?.name,
  });

  // const newcustomerdata = customerData?.result ?? [];
  const customers = customerData?.result ?? [];
  const totalcustomers = customerData?.totalcount ?? 0;

  console.log("Customers data received:", customers);
  console.log("Total customers count from API:", totalcustomers);

  useEffect(() => {
    // This effect runs when the 'customers' data from the API changes
    if (customers && Array.isArray(customers) && customers.length > 0) {
      // Helper function to safely extract, filter, and get unique strings
      const getUniqueStrings = (key: keyof Customer) => {
        return Array.from(
          new Set(
            customers
              .map((c) => c[key])
              // Type guard to ensure we only have valid strings
              .filter(
                (v): v is string => typeof v === "string" && v.trim() !== ""
              )
          )
        );
      };

      // Helper function to merge old and new options without duplicates
      const mergeOptions = (prevOptions: string[], newOptions: string[]) => {
        const combined = new Set<string>([...prevOptions, ...newOptions]);
        const newArray = Array.from(combined).sort();

        // Only update state if the array content has actually changed
        if (
          JSON.stringify(newArray) !==
          JSON.stringify(prevOptions.slice().sort())
        ) {
          return newArray;
        }
        return prevOptions; // No change
      };

      // Update all stable state lists
      setAllCreatorOptions((prev) =>
        mergeOptions(prev, getUniqueStrings("createdByUserName"))
      );
      setAllAssignedUserOptions((prev) =>
        mergeOptions(prev, getUniqueStrings("assignedUserName"))
      );
      setAllIndustryOptions((prev) =>
        mergeOptions(prev, getUniqueStrings("industry"))
      );
      setAllCountryOptions((prev) =>
        mergeOptions(prev, getUniqueStrings("country"))
      );
      setAllTimeZoneOptions((prev) =>
        mergeOptions(prev, getUniqueStrings("timeZone"))
      );
      setAllLifecycleStageOptions((prev) =>
        mergeOptions(prev, getUniqueStrings("lifecycleStage"))
      );
    }
  }, [customers]); // Dependency: only run when 'customers' data changes

  // --- Extract filter options (now potentially incomplete, based only on current page) ---
  // Consider fetching these options from dedicated API endpoints if needed for full dropdowns
  const statusOptions = ["active", "inactive", "prospect"]; // Assuming fixed statuses
  const industryOptions = Array.from(
    new Set(customers?.map((c) => c.industry)?.filter(Boolean))
  ) as string[];
  const countryOptions = Array.from(
    new Set(customers?.map((c) => c.country)?.filter(Boolean))
  ) as string[];
  const timeZoneOptions = Array.from(
    new Set(customers?.map((c) => c.timeZone)?.filter(Boolean))
  ) as string[];
  const lifecycleStageOptions = Array.from(
    new Set(customers?.map((c) => c.lifecycleStage)?.filter(Boolean))
  ) as string[];
  const assignedUserOptions = Array.from(
    new Set(customers?.map((c) => c.assignedUserName)?.filter(Boolean))
  ) as string[];
  const createdByOptions = Array.from(
    new Set(customers?.map((c) => c.createdByUserName)?.filter(Boolean))
  ) as string[];

  // --- 👇 REMOVE CLIENT-SIDE FILTERING LOGIC 👇 ---
  // const filteredCustomers = customers?.filter(customer => { ... });

  // Recalculate active filters count
  useEffect(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.industry !== "all") count++;
    if (filters.country !== "all") count++;
    if (filters.timeZone !== "all") count++;
    if (filters.lifecycleStage !== "all") count++;
    // Check if range is different from default
    if (filters.employeeRange[0] !== 0 || filters.employeeRange[1] !== 10000)
      count++;
    if (filters.revenueRange[0] !== 0 || filters.revenueRange[1] !== 1000000000)
      count++;
    if (filters.assignedUser !== "all") count++;
    if (filters.createdBy !== "all") count++;
    if (filters.hasWebsite !== null) count++;
    if (filters.hasEmail !== null) count++;
    if (searchTerm !== "") count++;
    setActiveFiltersCount(count); // Update renamed state
  }, [filters, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [filters, searchTerm]); // Dependencies that reset page

  // Permissions useEffect
  useEffect(() => {
    const rolePermissions = (userrole as any)?.permissions as
      | string[]
      | undefined;
    setIsAllowedAddCustomer(
      rolePermissions?.includes("all") ||
      rolePermissions?.includes("create_customers") ||
      false
    );
    setIsAllowedEditCustomer(
      rolePermissions?.includes("all") ||
      rolePermissions?.includes("edit_customers") ||
      false
    );
    setIsAllowedDeleteCustomer(
      rolePermissions?.includes("all") ||
      rolePermissions?.includes("delete_customers") ||
      false
    );
  }, [userrole]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/customers/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete customer");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/customers"],
      }); // More specific invalidation
      toast({ title: "Customer deleted" });
    },
    onError: (error: Error) => {
      // Simplified error message extraction
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer.",
        variant: "destructive",
      });
    },
  });

  const resetFilters = () => {
    // Unchanged
    setFilters({
      status: "all",
      industry: "all",
      country: "all",
      timeZone: "all",
      lifecycleStage: "all",
      employeeRange: [0, 10000],
      revenueRange: [0, 1000000000],
      assignedUser: "all",
      createdBy: "all",
      hasWebsite: null,
      hasEmail: null,
    });
    setSearchTerm("");
    // setPage(1); // Handled by useEffect
  };

  const totalItems = totalcustomers; // Use total count from API
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0; // Correct calculation

  // --- Action Handlers (mostly unchanged) ---
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };
  const handleBulkImport = () => {
    setIsImportModelOpen(true);
  };
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };
  const handleViewClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewCustomerModelOpen(true);
  };
  const handleDeleteCustomer = async (id: number) => {
    toast({
      title: "Confirm Deletion",
      description:
        "Are you sure you want to delete this customer? This may affect associated Leads, Opportunities, etc.", // Added warning
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
  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "prospect":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800"; // Default/Unknown status color
    }
  };

  // --- Render Functions ---
  const renderLoading = () => <TableSkeleton />;

  const renderTableContent = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>Ownership</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm || activeFiltersCount > 0
                    ? "No customers match your criteria."
                    : "No customers found."}
                </div>
                {(searchTerm || activeFiltersCount > 0) && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="mt-2"
                  >
                    <Repeat className="w-4 h-4 mr-2" /> Reset filters
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            customers.map(
              (
                customer // Use `customers`
              ) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8 rounded-full overflow-hidden">
                        <AvatarImage src={customer.avatar ? customer.avatar : fallbackUrl} alt='avatar' className="w-full h-full object-cover" />
                      </Avatar>
                      {customer.companyName || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>{customer.industry || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {customer.email && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.website && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <a
                            href={
                              customer.website.startsWith("http")
                                ? customer.website
                                : `//${customer.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate max-w-[150px]"
                          >
                            {customer.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(customer.status)}>
                      {customer.status || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.numOfEmployees
                      ? customer.numOfEmployees.toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {customer.annualRevenue
                      ? `$${(Number(customer.annualRevenue) / 1000000).toFixed(
                        1
                      )}M`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {customer.createdByUserName === activeUser?.username ? (
                      <Badge className="bg-green-100 text-green-800">
                        Created
                      </Badge>
                    ) : customer.assignedUserId === activeUser?.id ? (
                      <Badge className="bg-purple-100 text-purple-800">
                        Assigned
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">Other</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {isAllowedEditCustomer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                      {isAllowedDeleteCustomer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Associations"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSeeCustomerAssociatedThngs(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            )
          )}
        </TableBody>
      </Table>
    </div>
  );

  // ✅ NEW: Pagination is now its own function
  const renderPagination = () => (
    <>
      {totalItems > 0 && totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * limit + 1, totalItems)} to{" "}
            {Math.min(page * limit, totalItems)} of {totalItems} Customers
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
    </>
  );

  return (
    // ✅ ROOT: Changed to h-screen and overflow-hidden to lock the page
    <div className="flex h-screen w-full overflow-hidden">
      {/* 1. SIDEBAR (Fixed Left) */}
      <div className="bg-[#001E40] flex-shrink-0">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 2. MAIN CONTENT AREA (Fixed Header, Scrolling Content) */}
      <div className="flex-1 flex flex-col overflow-hidden w-full md:w-auto">
        {/* FIXED HEADER */}
        <DashboardHeader
          userName="Customers"
          subtitle="Manage your customer relationships"
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

        {/* ✅ SCROLLING CONTENT WRAPPER */}
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {/* This card now scrolls inside the main tag.
            You do NOT need the complex scrolling table logic anymore.
          */}
          <Card className="w-full">
            <CardHeader>
              {/* Title, Description, Buttons */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>All Customers</CardTitle>
                  <CardDescription>
                    Manage your customer database and relationships
                  </CardDescription>
                </div>
                {isAllowedAddCustomer && (
                  <div className="gap-2 flex items-center">
                    {/* <Button
                      onClick={handleBulkImport}
                      className="bg-primary hover:bg-primary/90 h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Bulk Import
                    </Button> */}
                    <RoundedPrimaryButton
                      title="Bulk Import"
                      onClick={handleBulkImport}
                      icon={<Plus className="w-4 h-4 mr-2" />}
                    />
                    {/* <Button
                      onClick={handleAddCustomer}
                      className="bg-primary hover:bg-primary/90 h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Customer
                    </Button> */}
                    <RoundedPrimaryButton
                      title="Add Customer"
                      onClick={handleAddCustomer}
                      icon={<Plus className="w-4 h-4 mr-2" />}
                      iconAlt="Add"
                    />
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
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                  {/* Filter Button */}
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center h-9"
                  >
                    <Filter className="w-4 h-4 mr-2" /> Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-2">{activeFiltersCount}</Badge>
                    )}
                    {showFilters ? (
                      <ChevronUp className="w-4 h-4 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                  {/* Clear Button */}
                  {activeFiltersCount > 0 && (
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
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t items-end">
                    {/* Status */}
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={filters.status}
                        onValueChange={(v) =>
                          setFilters({ ...filters, status: v })
                        }
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {statusOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o.charAt(0).toUpperCase() + o.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Industry */}
                    {industryOptions.length > 0 && (
                      <div>
                        <Label>Industry</Label>
                        <Select
                          value={filters.industry}
                          onValueChange={(v) =>
                            setFilters({ ...filters, industry: v })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Industries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Industries</SelectItem>
                            {industryOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Country */}
                    {countryOptions.length > 0 && (
                      <div>
                        <Label>Country</Label>
                        <Select
                          value={filters.country}
                          onValueChange={(v) =>
                            setFilters({ ...filters, country: v })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Countries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Countries</SelectItem>
                            {countryOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Time Zone */}
                    {timeZoneOptions.length > 0 && (
                      <div>
                        <Label>Time Zone</Label>
                        <Select
                          value={filters.timeZone}
                          onValueChange={(v) =>
                            setFilters({ ...filters, timeZone: v })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Time Zones" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time Zones</SelectItem>
                            {timeZoneOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Lifecycle Stage */}
                    {lifecycleStageOptions.length > 0 && (
                      <div>
                        <Label>Lifecycle Stage</Label>
                        <Select
                          value={filters.lifecycleStage}
                          onValueChange={(v) =>
                            setFilters({ ...filters, lifecycleStage: v })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Stages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {lifecycleStageOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Employee Range */}
                    <div>
                      <Label>Employees</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          className="h-9"
                          type="number"
                          placeholder="Min (0)"
                          value={filters.employeeRange[0]}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              employeeRange: [
                                parseInt(e.target.value) || 0,
                                Math.max(
                                  parseInt(e.target.value) || 0,
                                  filters.employeeRange[1]
                                ),
                              ],
                            })
                          }
                        />
                        <Input
                          className="h-9"
                          type="number"
                          placeholder="Max (10k)"
                          value={filters.employeeRange[1]}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              employeeRange: [
                                filters.employeeRange[0],
                                Math.max(
                                  filters.employeeRange[0],
                                  parseInt(e.target.value) || 10000
                                ),
                              ],
                            })
                          }
                        />
                      </div>
                    </div>
                    {/* Revenue Range */}
                    <div>
                      <Label>Revenue ($)</Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          className="h-9"
                          type="number"
                          placeholder="Min (0)"
                          value={filters.revenueRange[0]}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              revenueRange: [
                                parseInt(e.target.value) || 0,
                                Math.max(
                                  parseInt(e.target.value) || 0,
                                  filters.revenueRange[1]
                                ),
                              ],
                            })
                          }
                        />
                        <Input
                          className="h-9"
                          type="number"
                          placeholder="Max (1B)"
                          value={filters.revenueRange[1]}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              revenueRange: [
                                filters.revenueRange[0],
                                Math.max(
                                  filters.revenueRange[0],
                                  parseInt(e.target.value) || 1000000000
                                ),
                              ],
                            })
                          }
                        />
                      </div>
                    </div>
                    {/* Assigned User */}
                    {assignedUserOptions.length > 0 && (
                      <div>
                        <Label>Assigned To</Label>
                        <Select
                          value={filters.assignedUser}
                          onValueChange={(v) =>
                            setFilters({ ...filters, assignedUser: v })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Users" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {assignedUserOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Created By */}
                    {allCreatorOptions.length > 0 && (
                      <div>
                        <Label htmlFor="created-filter">Created By</Label>
                        <Select
                          value={filters.createdBy}
                          onValueChange={(v) =>
                            setFilters({ ...filters, createdBy: v })
                          }
                        >
                          <SelectTrigger
                            id="created-filter"
                            className="mt-1 h-9"
                          >
                            <SelectValue placeholder="All Users" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {allCreatorOptions.map((o) => (
                              <SelectItem key={o} value={o}>
                                {o}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Has Website */}
                    <div>
                      <Label className="block mb-1">Has Website</Label>
                      <div className="flex space-x-3 mt-2">
                        <Label className="flex items-center">
                          <Checkbox
                            checked={filters.hasWebsite === null}
                            onCheckedChange={() =>
                              setFilters({ ...filters, hasWebsite: null })
                            }
                            className="mr-1"
                          />
                          All
                        </Label>
                        <Label className="flex items-center">
                          <Checkbox
                            checked={filters.hasWebsite === true}
                            onCheckedChange={() =>
                              setFilters({ ...filters, hasWebsite: true })
                            }
                            className="mr-1"
                          />
                          Yes
                        </Label>
                        <Label className="flex items-center">
                          <Checkbox
                            checked={filters.hasWebsite === false}
                            onCheckedChange={() =>
                              setFilters({ ...filters, hasWebsite: false })
                            }
                            className="mr-1"
                          />
                          No
                        </Label>
                      </div>
                    </div>
                    {/* Has Email */}
                    <div>
                      <Label className="block mb-1">Has Email</Label>
                      <div className="flex space-x-3 mt-2">
                        <Label className="flex items-center">
                          <Checkbox
                            checked={filters.hasEmail === null}
                            onCheckedChange={() =>
                              setFilters({ ...filters, hasEmail: null })
                            }
                            className="mr-1"
                          />
                          All
                        </Label>
                        <Label className="flex items-center">
                          <Checkbox
                            checked={filters.hasEmail === true}
                            onCheckedChange={() =>
                              setFilters({ ...filters, hasEmail: true })
                            }
                            className="mr-1"
                          />
                          Yes
                        </Label>
                        <Label className="flex items-center">
                          <Checkbox
                            checked={filters.hasEmail === false}
                            onCheckedChange={() =>
                              setFilters({ ...filters, hasEmail: false })
                            }
                            className="mr-1"
                          />
                          No
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* This is the content that scrolls */}
              {isLoading || isFetching ? renderLoading() : renderTableContent()}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={selectedCustomer}
      />
      <CustomersImportModal
        isOpen={isImportModelOpen}
        onClose={() => setIsImportModelOpen(false)}
      />
      <CustomerViewModel
        isOpen={ViewCustomerModelOpen}
        onClose={() => setViewCustomerModelOpen(false)}
        customer={selectedCustomer}
      />
      <ViewCustomerAssociationModal
        isOpen={SeeCustomerAssociatedThngs}
        onClose={() => setSeeCustomerAssociatedThngs(false)}
        customer={selectedCustomer}
      />
    </div>
  );
}
