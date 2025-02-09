import { useState, memo, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight, ArrowUpIcon, ArrowDownIcon, X, FilterX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccreditationStatus } from "@/types/company";
import { Button } from "@/components/ui/button";
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

const CompanyRow = memo(({ company, isHovered, onRowClick, onHoverChange, searchTerm }: {
  company: Company;
  isHovered: boolean;
  onRowClick: () => void;
  onHoverChange: (isHovered: boolean) => void;
  searchTerm: string;
}) => (
  <TableRow
    className="group cursor-pointer hover:bg-muted/50 bg-white"
    onClick={onRowClick}
    onMouseEnter={() => onHoverChange(true)}
    onMouseLeave={() => onHoverChange(false)}
  >
    <TableCell>
      <div className="flex items-center gap-3">
        <CompanyLogo
          companyId={company.id}
          companyName={company.name}
          size="sm"
        />
        <span className={cn(
          "font-normal text-foreground",
          isHovered && "underline"
        )}>
          <HighlightText text={company.name} searchTerm={searchTerm} />
        </span>
      </div>
    </TableCell>
    <TableCell className="text-right">{company.riskScore || "N/A"}</TableCell>
    <TableCell className="text-center">
      <Badge
        variant="outline"
        className={cn(
          "capitalize",
          company.accreditationStatus === 'PENDING' && "bg-yellow-100 text-yellow-800",
          company.accreditationStatus === 'IN_REVIEW' && "bg-yellow-100 text-yellow-800",
          company.accreditationStatus === 'PROVISIONALLY_APPROVED' && "bg-green-100 text-green-800",
          company.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800",
          company.accreditationStatus === 'SUSPENDED' && "bg-gray-100 text-gray-800",
          company.accreditationStatus === 'REVOKED' && "bg-red-100 text-red-800",
          company.accreditationStatus === 'EXPIRED' && "bg-red-100 text-red-800",
          company.accreditationStatus === 'AWAITING_INVITATION' && "bg-gray-100 text-gray-800"
        )}
      >
        {company.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
      </Badge>
    </TableCell>
    <TableCell className="text-center">
      <div className="invisible group-hover:visible flex items-center justify-center text-primary">
        <span className="font-medium mr-2">View</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </TableCell>
  </TableRow>
));

CompanyRow.displayName = 'CompanyRow';

interface Company {
  id: number;
  name: string;
  riskScore?: number;
  accreditationStatus: AccreditationStatus;
  logo?: {
    id: string;
    filePath: string;
  } | null;
}

export default function NetworkPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "ALL">("ALL");
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
    if (status) setStatusFilter(status as AccreditationStatus | "ALL");
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

  const { data: companiesData = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: !!user
  });

  const companies = useMemo(() =>
    companiesData.map((item: any) => item.companies || item),
    [companiesData]
  );

  // Initialize Fuse instance for fuzzy search
  const fuse = useMemo(() => new Fuse(companies, {
    keys: ['name'],
    threshold: 0.3,
    includeMatches: true,
  }), [companies]);

  const sortCompanies = (a: Company, b: Company) => {
    if (sortField === "name") {
      return sortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortField === "riskScore") {
      const scoreA = a.riskScore || 0;
      const scoreB = b.riskScore || 0;
      return sortDirection === "asc" ? scoreA - scoreB : scoreB - scoreA;
    }
    return 0;
  };

  // Use fuzzy search for filtering company names only
  const filteredCompanies = useMemo(() => {
    let results = companies;

    if (searchQuery) {
      const fuseResults = fuse.search(searchQuery);
      results = fuseResults.map(result => result.item);
    }

    return results
      .filter((company: Company) =>
        statusFilter === "ALL" || company.accreditationStatus === statusFilter
      )
      .sort(sortCompanies);
  }, [companies, searchQuery, statusFilter, sortField, sortDirection, fuse]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  useQueries({
    queries: paginatedCompanies.map(company => ({
      queryKey: [`company-logo-${company.id}`],
      queryFn: async () => {
        try {
          const response = await fetch(`/api/companies/${company.id}/logo`);
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
      enabled: !!company.id,
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
      <div className="flex-1 space-y-6">
        <PageHeader
          title={currentCompany?.name ? `${currentCompany.name}'s Network` : "Network"}
          description="View and manage companies in your network."
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
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

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccreditationStatus | "ALL")}>
              <SelectTrigger className="w-[200px] justify-between bg-white">
                <SelectValue className="text-left" placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="AWAITING_INVITATION">Awaiting Invitation</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="PROVISIONALLY_APPROVED">Provisionally Approved</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
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
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent text-right w-full justify-end"
                    onClick={() => handleSort("riskScore")}
                  >
                    <span>Risk Score</span>
                    {getSortIcon("riskScore")}
                  </Button>
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
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No companies found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompanies.map((company: Company) => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    isHovered={hoveredRow === company.id}
                    onRowClick={() => setLocation(`/network/company/${generateSlug(company.name)}`)}
                    onHoverChange={(isHovered) => setHoveredRow(isHovered ? company.id : null)}
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
              ) : filteredCompanies.length > 0 ? (
                <>
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} results
                </>
              ) : (
                "No results found"
              )}
            </div>

            {!isLoading && filteredCompanies.length > itemsPerPage && (
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
      </div>
    </DashboardLayout>
  );
}