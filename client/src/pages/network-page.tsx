import { useState, memo, useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight, ArrowUpIcon, ArrowDownIcon, FilterIcon } from "lucide-react";
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
import logoNull from "@/assets/logo_null.svg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

// Helper function to generate consistent slugs - must match company-profile-page.tsx
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const itemsPerPage = 5;

interface Company {
  id: number;
  name: string;
  riskScore?: number;
  accreditationStatus: AccreditationStatus;
}

// Create a memoized component for company logo
const CompanyLogo = memo(({ company }: { company: Company }) => {
  const { data: logoUrl } = useQuery({
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
    staleTime: Infinity, // Never mark the data as stale
    cacheTime: Infinity, // Keep the data cached indefinitely
    retry: false, // Don't retry failed requests
  });

  return (
    <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
      <img
        src={logoUrl || logoNull}
        alt={`${company.name} logo`}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => {
          // If there's an error loading the logo, it will fall back to logoNull
          // No need to set src explicitly as we're using the || operator above
        }}
      />
    </div>
  );
});

CompanyLogo.displayName = 'CompanyLogo';

export default function NetworkPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "ALL">("ALL");
  const { user } = useAuth();

  const { data: currentCompany } = useQuery({
    queryKey: ["/api/companies/current"],
    enabled: !!user
  });

  const { data: companiesData = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Extract companies from the nested structure
  const companies = companiesData.map(item => item.companies || item);

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

  // Memoize the filtered and sorted companies to prevent unnecessary recalculations
  const filteredCompanies = useMemo(() => 
    companies
      .filter((company: Company) => {
        const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || company.accreditationStatus === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort(sortCompanies),
    [companies, searchQuery, statusFilter, sortField, sortDirection]
  );

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

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  // Prefetch all company logos for visible companies
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
      enabled: !!company.id, // Only prefetch if company ID exists
    }))
  });

  // Update the company row to use the memoized logo component
  const CompanyRow = memo(({ company, isHovered, onRowClick, onHoverChange }: {
    company: Company;
    isHovered: boolean;
    onRowClick: () => void;
    onHoverChange: (isHovered: boolean) => void;
  }) => (
    <TableRow
      className="group cursor-pointer hover:bg-muted/50 bg-white"
      onClick={onRowClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <CompanyLogo company={company} />
          <span className={cn(
            "font-normal text-foreground",
            isHovered && "underline"
          )}>
            {company.name}
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

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6">
        <PageHeader
          title={currentCompany?.name ? `${currentCompany.name}'s Network` : 'Network'}
          description="View and manage companies in your network."
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccreditationStatus | "ALL")}>
              <SelectTrigger className="w-[200px] justify-between bg-white">
                <div className="flex items-center">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  <SelectValue className="text-left" placeholder="Filter by status" />
                </div>
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
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent text-center w-full justify-center"
                    onClick={() => handleSort("accreditationStatus")}
                  >
                    <span>Status</span>
                    {getSortIcon("accreditationStatus")}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading...
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
                  />
                ))
              )}
            </TableBody>
          </Table>

          {/* Table footer with details and pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            {/* Table details */}
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

            {/* Pagination controls - only show if more than itemsPerPage items and not loading */}
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