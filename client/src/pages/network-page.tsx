import { useState, memo, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight, ArrowUpIcon, ArrowDownIcon, X, FilterX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PageTemplate } from "@/components/ui/page-template";
import { cn } from "@/lib/utils";
import Fuse from 'fuse.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { CompanyLogo } from "@/components/ui/company-logo";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InviteButton } from "@/components/ui/invite-button";
import { InviteModal } from "@/components/playground/InviteModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Company } from "@/types/company";

// Updated interface to match the actual API response
interface NetworkRelationship {
  id: number;
  companyName: string;
  status: string;
  type: string;
}

const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const itemsPerPage = 5;

// Highlight matching text helper function
const HighlightText = ({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm) return <>{text}</>;

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => (
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <span key={i} className="bg-primary/10 text-primary">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}
    </>
  );
};

// Updated CompanyRow component to use the new data structure
const CompanyRow = memo(({ relationship, isHovered, onRowClick, onHoverChange, searchTerm }: {
  relationship: NetworkRelationship;
  isHovered: boolean;
  onRowClick: () => void;
  onHoverChange: (isHovered: boolean) => void;
  searchTerm: string;
}) => {
  // Add safety check for relationship
  if (!relationship) return null;
  
  return (
    <TableRow
      className="group cursor-pointer hover:bg-muted/50 bg-white"
      onClick={onRowClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <CompanyLogo
            companyId={relationship.id}
            companyName={relationship.companyName || 'Unknown Company'}
            size="sm"
          />
          <span className={cn(
            "font-normal text-foreground",
            isHovered && "underline"
          )}>
            <HighlightText text={relationship.companyName || 'Unknown Company'} searchTerm={searchTerm} />
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">N/A</TableCell>
      <TableCell className="text-center">
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            relationship.status === 'active' && "bg-green-100 text-green-800"
          )}
        >
          {relationship.status || 'N/A'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="invisible group-hover:visible flex items-center justify-center text-primary">
          <span className="font-medium mr-2">View</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </TableCell>
    </TableRow>
  );
});

CompanyRow.displayName = 'CompanyRow';

export default function NetworkPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [openFinTechModal, setOpenFinTechModal] = useState(false);
  const { user } = useAuth();

  // Load filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const search = params.get('search');
    const status = params.get('status');
    const sort = params.get('sort');
    const direction = params.get('direction');

    if (page) setCurrentPage(parseInt(page));
    if (search) setSearchQuery(search);
    if (status) setStatusFilter(status);
    if (sort) setSortField(sort);
    if (direction) setSortDirection(direction as "asc" | "desc");
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage !== 1) params.set('page', currentPage.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== "ALL") params.set('status', statusFilter);
    if (sortField !== "name") params.set('sort', sortField);
    if (sortDirection !== "asc") params.set('direction', sortDirection);

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [currentPage, searchQuery, statusFilter, sortField, sortDirection]);

  const { data: currentCompany, isLoading: isCurrentCompanyLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    enabled: !!user
  });

  // Updated to handle errors properly without onSuccess/onError
  const { data: networkRelationships = [], isLoading, error } = useQuery<NetworkRelationship[]>({
    queryKey: ["/api/relationships"],
    enabled: !!user,
    retry: 3
  });

  // Enhanced logging for debugging
  useEffect(() => {
    console.log("=== NETWORK RELATIONSHIPS DEBUG ===");
    console.log("Network relationships data:", networkRelationships);
    console.log("Network relationships type:", typeof networkRelationships);
    console.log("Network relationships is array:", Array.isArray(networkRelationships));
    console.log("Network relationships length:", Array.isArray(networkRelationships) ? networkRelationships.length : 0);
    console.log("Network relationships content:", JSON.stringify(networkRelationships));
    console.log("Is loading:", isLoading);
    console.log("Error:", error);
    console.log("=== END DEBUG ===");
    
    if (error) {
      console.error("Error fetching network relationships:", error);
    }

    // Direct API call for debugging
    if (!isLoading && user) {
      console.log("Making direct fetch call to /api/relationships");
      fetch('/api/relationships')
        .then(response => {
          console.log("Direct API response status:", response.status);
          return response.json();
        })
        .then(data => {
          console.log("Direct API response data:", data);
          console.log("Direct API data is array:", Array.isArray(data));
          console.log("Direct API data length:", Array.isArray(data) ? data.length : 0);
          
          // If we have data from the direct API call but not from the React Query,
          // let's manually update the UI with this data
          if (Array.isArray(data) && data.length > 0 && 
              (!Array.isArray(networkRelationships) || networkRelationships.length === 0)) {
            console.log("Using direct API data to update UI");
            // We can't directly update the networkRelationships state from React Query,
            // but we can force a refetch
            window.location.reload();
          }
        })
        .catch((err: Error) => {
          console.error("Direct API call error:", err);
        });
    }
  }, [networkRelationships, error, isLoading, user]);

  // Initialize Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    // Ensure we have data to work with
    const data = Array.isArray(networkRelationships) ? networkRelationships : [];
    return new Fuse(data, {
      keys: ['companyName'],
      threshold: 0.3,
    });
  }, [networkRelationships]);

  const sortCompanies = (a: NetworkRelationship, b: NetworkRelationship) => {
    // Add null checks to prevent errors
    if (!a || !b) return 0;
    
    if (sortField === "name") {
      // Handle cases where companyName might be undefined
      const nameA = a.companyName || '';
      const nameB = b.companyName || '';
      
      return sortDirection === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }
    return 0;
  };

  // Calculate paginated relationships first
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  // Use fuzzy search for filtering company names only
  const filteredRelationships = useMemo(() => {
    // Ensure we have data to work with
    const results = Array.isArray(networkRelationships) ? networkRelationships : [];
    console.log("Starting filtering with", results.length, "relationships");

    // Filter out any null or undefined items
    const validResults = results.filter(r => r !== null && r !== undefined);

    if (searchQuery && validResults.length > 0) {
      const fuseResults = fuse.search(searchQuery);
      console.log("Fuse search results:", fuseResults.length);
      return fuseResults.map(result => result.item)
        .filter((relationship: NetworkRelationship) => 
          relationship && (statusFilter === "ALL" || relationship.status.toLowerCase() === statusFilter.toLowerCase())
        )
        .sort(sortCompanies);
    }

    const filtered = validResults
      .filter((relationship: NetworkRelationship) => 
        relationship && (statusFilter === "ALL" || relationship.status.toLowerCase() === statusFilter.toLowerCase())
      )
      .sort(sortCompanies);
    
    console.log("Filtered relationships:", filtered.length);
    return filtered;
  }, [networkRelationships, searchQuery, statusFilter, sortField, sortDirection, fuse]);

  const totalPages = Math.ceil((filteredRelationships?.length || 0) / itemsPerPage);
  const paginatedRelationships = filteredRelationships?.slice(startIndex, startIndex + itemsPerPage) || [];

  // Log filtered relationships for debugging
  useEffect(() => {
    if (filteredRelationships && paginatedRelationships) {
      console.log("Filtered relationships:", filteredRelationships);
      console.log("Paginated relationships:", paginatedRelationships);
    }
  }, [filteredRelationships, paginatedRelationships]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const findCompanyBySlug = (slug: string) => {
    const relationships = Array.isArray(networkRelationships) ? networkRelationships : [];
    return relationships.find((r: NetworkRelationship) => 
      generateSlug(r.companyName) === slug ||
      r.id === parseInt(slug)
    );
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  useQueries({
    queries: (paginatedRelationships || []).map((relationship: NetworkRelationship) => ({
      queryKey: [`company-logo-${relationship?.id}`],
      queryFn: async () => {
        try {
          if (!relationship?.id) return null;
          const response = await fetch(`/api/companies/${relationship.id}/logo`);
          if (!response.ok) return null;
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        } catch (error) {
          return null;
        }
      },
      staleTime: Infinity,
      cacheTime: Infinity,
      retry: false,
      enabled: !!relationship?.id,
    }))
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "ALL";

  return (
    <DashboardLayout>
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          <PageHeader
            title={currentCompany?.name ? `${currentCompany.name}'s Network` : "Network"}
            description="View and manage companies in your network."
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Testing create relationships endpoint");
                    fetch('/api/test/create-relationships')
                      .then(response => {
                        console.log("Create relationships status:", response.status);
                        return response.json();
                      })
                      .then(data => {
                        console.log("Create relationships response:", data);
                        // Refresh the data
                        window.location.reload();
                      })
                      .catch((err: Error) => {
                        console.error("Create relationships error:", err);
                      });
                  }}
                >
                  Create Test Relationships
                </Button>
                <InviteButton
                  variant="fintech"
                  pulse={true}
                  onClick={() => setOpenFinTechModal(true)}
                />
              </div>
            }
          />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={cn(
                "h-10 w-10",
                hasActiveFilters ? "bg-primary hover:bg-primary/90 text-white hover:text-white" : "bg-white border border-input rounded-md",
                !hasActiveFilters && "opacity-50 cursor-not-allowed"
              )}
            >
              <FilterX className="h-4 w-4" />
              <span className="sr-only">Clear filters</span>
            </Button>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-[200px] justify-between bg-white">
                <SelectValue className="text-left" placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Network"
                className="pl-9 pr-9 bg-white"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          <div className="bg-background rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">
                    <Button
                      variant="ghost"
                      className="p-0 hover:bg-transparent text-left w-full justify-start"
                      onClick={() => handleSort("name")}
                    >
                      <span>Company</span>
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <span>Risk Score</span>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-[400px]">
                      <div className="flex items-center justify-center w-full h-full">
                        <LoadingSpinner size="lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-red-500">
                      Error loading data: {(error as Error).message}
                    </TableCell>
                  </TableRow>
                ) : paginatedRelationships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRelationships.map((relationship: NetworkRelationship) => (
                    <CompanyRow
                      key={relationship.id}
                      relationship={relationship}
                      isHovered={hoveredRow === relationship.id}
                      onRowClick={() => {
                        setLocation(`/network/company/${relationship.id}`);
                      }}
                      onHoverChange={(isHovered) => setHoveredRow(isHovered ? relationship.id : null)}
                      searchTerm={searchQuery}
                    />
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading results..."
                ) : filteredRelationships && filteredRelationships.length > 0 ? (
                  <>
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRelationships.length)} of {filteredRelationships.length} results
                  </>
                ) : (
                  "No results found"
                )}
              </div>

              {!isLoading && filteredRelationships && filteredRelationships.length > itemsPerPage && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
          <InviteModal
            variant="fintech"
            open={openFinTechModal}
            onOpenChange={setOpenFinTechModal}
          />
        </div>
      </PageTemplate>
    </DashboardLayout>
  );
}