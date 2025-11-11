import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Sidebar from "@/components/layout/sidebarv-2"; // Assuming sidebarv-2 is the correct path
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
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Repeat,
} from "lucide-react";
import { Contact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ContactModal } from "@/components/modals/contact-modal";
import { BulkImportModal } from "@/components/modals/bulk-import";
import { ViewContactModal } from "@/components/modals/ViewContactModal";
import { useRoleStore, useUserStore } from "@/stores/useRoleStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import RoundedPrimaryButton from "@/components/ui/RoundedPrimaryButton";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";
// --- Filter Types ---
interface Filters {
  status: boolean | null; // true=active, false=inactive, null=all
  assignedUser: string; // Keep 'all' or username
  createdBy: string; // Keep 'all' or username
  jobTitle: string; // Keep 'all' or specific title
  industry: string; // Keep 'all' or specific industry
  countryRegion: string; // Keep 'all' or specific country
  timeZone: string; // Keep 'all' or specific timezone
  marketingStatus: string; // Keep 'all' or specific status
  tags: string[]; // Keep as array for potential future multi-select
}

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAllowedAddContact, setIsAllowedAddContact] = useState(false);
  const [isAllowedEditContact, setIsAllowedEditContact] = useState(false);
  const [isAllowedDeleteContact, setIsAllowedDeleteContact] = useState(false);
  const [allCreatorOptions, setAllCreatorOptions] = useState<string[]>([]);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const limit = 25;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const fallbackUrl = FALLBACK_URL;


  const [filters, setFilters] = useState<Filters>({
    status: null,
    assignedUser: "all",
    createdBy: "all",
    jobTitle: "all",
    industry: "all",
    countryRegion: "all",
    timeZone: "all",
    marketingStatus: "all",
    tags: [],
  });

  const userrole = useRoleStore((state) => state.role);
  const activeUser = useUserStore((state) => state.user);

  // --- Fetch Data ---
  const {
    data: contactsData,
    isLoading,
    isFetching,
    error,
  } = useQuery<{
    result: Contact[];
    totalcount: number;
  }>({
    queryKey: [
      "/api/contacts/user",
      page,
      limit,
      activeUser?.id,
      userrole?.name,
      filters,
      searchTerm,
    ],
    queryFn: async () => {
      if (!activeUser?.id || !userrole?.name)
        return { result: [], totalcount: 0 };

      const currentOffset = (page - 1) * limit;
      let url = `/api/contacts/user?userId=${activeUser.id}&role=${userrole.name}&limit=${limit}&offset=${currentOffset}`;

      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status !== null) url += `&status=${filters.status}`;
      if (filters.assignedUser !== "all")
        url += `&assignedUser=${encodeURIComponent(filters.assignedUser)}`;
      if (filters.createdBy !== "all")
        url += `&createdBy=${encodeURIComponent(filters.createdBy)}`;
      if (filters.jobTitle !== "all")
        url += `&jobTitle=${encodeURIComponent(filters.jobTitle)}`;
      if (filters.industry !== "all")
        url += `&industry=${encodeURIComponent(filters.industry)}`;
      if (filters.countryRegion !== "all")
        url += `&countryRegion=${encodeURIComponent(filters.countryRegion)}`;
      if (filters.timeZone !== "all")
        url += `&timeZone=${encodeURIComponent(filters.timeZone)}`;
      if (filters.marketingStatus !== "all")
        url += `&marketingStatus=${encodeURIComponent(
          filters.marketingStatus
        )}`;
      // if (filters.tags.length > 0) url += `&tags=${encodeURIComponent(filters.tags.join(','))}`;

      console.log("Fetching Contacts URL:", url);
      try {
        const res = await apiRequest("GET", url);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Failed to fetch contacts:", res.status, errorText);
          toast({
            title: "Fetch Error",
            description: `Server responded with status ${res.status}`,
            variant: "destructive",
          });
          throw new Error(`Failed to fetch contacts: ${res.status}`);
        }
        const data = await res.json();
        if (
          !data ||
          typeof data.totalcount !== "number" ||
          !Array.isArray(data.result)
        ) {
          console.error("Invalid contact data structure received:", data);
          toast({
            title: "Data Error",
            description: "Received invalid contact data from server.",
            variant: "destructive",
          });
          throw new Error(
            "Invalid contact data structure received from server."
          );
        }
        return data;
      } catch (err) {
        console.error("Error during contact fetch:", err);
        if (
          !(
            err instanceof Error &&
            err.message.startsWith("Failed to fetch contacts")
          )
        ) {
          toast({
            title: "Fetch Error",
            description:
              err instanceof Error
                ? err.message
                : "An unknown contact fetch error occurred",
            variant: "destructive",
          });
        }
        return { result: [], totalcount: 0 };
      }
    },
    enabled: !!activeUser?.id && !!userrole?.name,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const contacts = contactsData?.result ?? [];
  const totalcontact = contactsData?.totalcount ?? 0;

  // --- Logic to keep track of all unique creator names encountered ---
  useEffect(() => {
    if (contacts && Array.isArray(contacts) && contacts.length > 0) {
      try {
        const currentCreators = Array.from(
          new Set(
            contacts
              .map((c) => c.createdUserName)
              .filter(
                (v): v is string => typeof v === "string" && v.trim() !== ""
              )
          )
        );

        setAllCreatorOptions((prevOptions) => {
          const combined = new Set<string>([
            ...prevOptions,
            ...currentCreators,
          ]);
          const newOptions = Array.from(combined).sort();

          if (
            JSON.stringify(newOptions) !==
            JSON.stringify(prevOptions.slice().sort())
          ) {
            return newOptions;
          }
          return prevOptions;
        });
      } catch (mapError) {
        console.error(
          "Error updating creator options:",
          mapError,
          "Contacts data:",
          contacts
        );
      }
    }
  }, [contacts]);

  // Recalculate active filters count
  useEffect(() => {
    let count = 0;
    if (filters.status !== null) count++;
    if (filters.assignedUser !== "all") count++;
    if (filters.createdBy !== "all") count++;
    if (filters.jobTitle !== "all") count++;
    if (filters.industry !== "all") count++;
    if (filters.countryRegion !== "all") count++;
    if (filters.timeZone !== "all") count++;
    if (filters.marketingStatus !== "all") count++;
    if (filters.tags.length > 0) count++;
    if (searchTerm !== "") count++;
    setActiveFiltersCount(count);
  }, [filters, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [filters, searchTerm, page]); // Added 'page' dependency to avoid infinite loop warning

  // Permissions useEffect
  useEffect(() => {
    const rolePermissions = (userrole as any)?.permissions as
      | string[]
      | undefined;
    setIsAllowedAddContact(
      rolePermissions?.includes("all") ||
      rolePermissions?.includes("create_contacts") ||
      false
    );
    setIsAllowedEditContact(
      rolePermissions?.includes("all") ||
      rolePermissions?.includes("edit_contacts") ||
      false
    );
    setIsAllowedDeleteContact(
      rolePermissions?.includes("all") ||
      rolePermissions?.includes("delete_contacts") ||
      false
    );
  }, [userrole]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/contacts/user",
          activeUser?.id,
          userrole?.name,
          filters,
          searchTerm,
        ],
      });
      toast({ title: "Contact deleted" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive",
      });
    },
  });

  const resetFilters = () => {
    setFilters({
      status: null,
      assignedUser: "all",
      createdBy: "all",
      jobTitle: "all",
      industry: "all",
      countryRegion: "all",
      timeZone: "all",
      marketingStatus: "all",
      tags: [],
    });
    setSearchTerm("");
  };

  const totalItems = totalcontact;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

  // --- Action Handlers ---
  const handleAddContact = () => {
    setSelectedContact(null);
    setIsModalOpen(true);
  };
  const handleBulkImport = () => {
    setIsBulkImportModalOpen(true);
  };
  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };
  const handleDeleteContact = async (id: number) => {
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this contact?",
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

  // --- Render Functions ---
  const renderLoading = () => <TableSkeleton />;

  const renderTableContent = () => (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-gray-500">
                    {searchTerm || activeFiltersCount > 0
                      ? "No contacts match your criteria."
                      : "No contacts found."}
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
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8 rounded-full overflow-hidden  flex justify-center items-center">
                        <AvatarImage
                          src={contact.avatar ? contact.avatar : fallbackUrl}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                      <span>
                        {contact.firstName} {contact.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {contact.email && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-1 text-sm">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{contact.companyName || "—"}</TableCell>
                  <TableCell>{contact.jobTitle || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={contact.isActive ? "default" : "secondary"}>
                      {contact.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.createdUserName === activeUser?.username ? (
                      <Badge className="bg-green-100 text-green-800">
                        Created
                      </Badge>
                    ) : contact.assignedUserName === activeUser?.username ? (
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
                        onClick={() => handleViewContact(contact)}
                        className="p-1"
                      >
                        <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </Button>
                      {isAllowedEditContact && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContact(contact)}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                      )}
                      {isAllowedDeleteContact && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
      {totalItems > 0 && totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * limit + 1, totalItems)} to{" "}
            {Math.min(page * limit, totalItems)} of {totalItems} contacts
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

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            userName="Contacts"
            subtitle="Manage your business contacts"
            issearch={false}
          />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            {renderLoading()}
          </main>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <div className="bg-[#001E40] flex-shrink-0">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            userName="Contacts"
            subtitle="Manage your business contacts"
            issearch={false}
          />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <p className="text-red-500">
              Error fetching contacts. Please try refreshing.
            </p>
          </main>
        </div>
      </div>
    );
  }

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
          userName="Contacts"
          subtitle="Manage your business contacts"
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
          <Card className="w-full">
            <CardHeader>
              {/* Title, Description, Buttons */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>All Contacts</CardTitle>
                  <CardDescription>
                    Manage your contact database and relationships
                  </CardDescription>
                </div>
                {isAllowedAddContact && (
                  <div className="flex items-center space-x-2">
                    {/* <Button
                      onClick={handleBulkImport}
                      className="bg-primary hover:bg-primary/90 h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Bulk Import
                    </Button>
                    <Button
                      onClick={handleAddContact}
                      className="bg-primary hover:bg-primary/90 h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Contact
                    </Button> */}
                    <RoundedPrimaryButton
                      title="Bulk Import"
                      onClick={handleBulkImport}
                      icon={<Plus className="w-4 h-4 mr-2" />}
                      iconAlt="Add"
                    />
                    <RoundedPrimaryButton
                      title="Add Contact"
                      onClick={handleAddContact}
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
                      placeholder="Search contacts..."
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {/* Status Filter */}
                    <div>
                      <Label>Status</Label>
                      <RadioGroup
                        value={
                          filters.status === null
                            ? "all"
                            : filters.status === true
                              ? "active"
                              : "inactive"
                        }
                        onValueChange={(value) => {
                          if (value === "all")
                            setFilters({ ...filters, status: null });
                          else if (value === "active")
                            setFilters({ ...filters, status: true });
                          else if (value === "inactive")
                            setFilters({ ...filters, status: false });
                        }}
                        className="flex space-x-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="status-all" />
                          <Label htmlFor="status-all">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="active" id="status-active" />
                          <Label htmlFor="status-active">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="inactive"
                            id="status-inactive"
                          />
                          <Label htmlFor="status-inactive">Inactive</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Created By Filter */}
                    {allCreatorOptions.length > 0 && (
                      <div>
                        <Label>Created By</Label>
                        <Select
                          value={filters.createdBy}
                          onValueChange={(v) =>
                            setFilters({ ...filters, createdBy: v })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="All Users" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {allCreatorOptions.map((creator) => (
                              <SelectItem key={creator} value={creator}>
                                {creator}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Add other filter inputs here using the same pattern */}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Table Content */}
              {isFetching ? renderLoading() : renderTableContent()}
            </CardContent>
          </Card>
        </main>
      </div>
      {/* Modals */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contact={selectedContact}
      />
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        bulkImportName="contact"
      />
      <ViewContactModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        contact={selectedContact}
      />
    </div>
  );
}
