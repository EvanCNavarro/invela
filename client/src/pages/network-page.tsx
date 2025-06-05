/**
 * ========================================
 * Network Page - Relationship Management
 * ========================================
 * 
 * Comprehensive network relationship management page providing advanced
 * search, filtering, and visualization capabilities for business partnerships
 * and third-party relationships. Features enterprise-grade data management
 * with real-time updates and collaborative invitation workflows.
 * 
 * Key Features:
 * - Advanced relationship search with fuzzy matching
 * - Multi-dimensional filtering and sorting capabilities
 * - Real-time invitation management and status tracking
 * - Accreditation status monitoring and compliance
 * - Interactive table with responsive design
 * - Tutorial integration for user guidance
 * 
 * Data Management:
 * - Real-time network relationship data
 * - Company accreditation status tracking
 * - Invitation workflow management
 * - Search optimization with Fuse.js
 * - Responsive data visualization
 * 
 * @module pages/NetworkPage
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, memo, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery, useQueries } from "@tanstack/react-query";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight, ArrowUpIcon, ArrowDownIcon, X, FilterX, TrendingDown, TrendingUp, Minus } from "lucide-react";
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
import { sessionDataService } from "@/lib/sessionDataService";
import { Company, AccreditationStatus } from "@/types/company";
import { CompanyLogo } from "@/components/ui/company-logo";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InviteButton } from "@/components/ui/invite-button";
import { InviteModal } from "@/components/playground/InviteModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccreditationStatusDisplay } from "@/components/company/AccreditationStatusDisplay";

interface NetworkRelationship {
  id: number;
  companyId: number;
  relatedCompanyId: number;
  relationshipType: string;
  status: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  relatedCompany: {
    id: number;
    name: string;
    category: string;
    logoId: number | null;
    accreditationStatus: AccreditationStatus;
    riskScore: number | null;
  };
}

const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const itemsPerPage = 5; // Manageable pagination for network companies

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

// Risk Monitoring Status Badge Component using authentic session data
const RiskMonitoringStatusBadge = ({ companyId, riskScore }: { companyId: number; riskScore: number | null }) => {
  const [status, setStatus] = useState<'Blocked' | 'Approaching Block' | 'Monitoring' | 'Stable'>('Stable');
  
  useEffect(() => {
    const fetchAuthenticStatus = () => {
      try {
        // Use authentic company data to get consistent status
        const companyData = { id: companyId, risk_score: riskScore, name: `Company ${companyId}` };
        const authenticData = sessionDataService.getCompanyData(companyData);
        setStatus(authenticData.status);
      } catch (error) {
        console.log('[RiskStatus] Error fetching status for company:', companyId);
        setStatus('Stable');
      }
    };
    
    fetchAuthenticStatus();
  }, [companyId, riskScore]);
  
  if (status === 'Blocked') {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
        Blocked
      </div>
    );
  }
  
  // All other statuses get muted styling
  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 whitespace-nowrap">
      {status}
    </div>
  );
};

// Risk Trend Component using authentic session data
const RiskTrendIndicator = ({ companyId, riskScore }: { companyId: number; riskScore: number | null }) => {
  const [trend, setTrend] = useState<'improving' | 'stable' | 'deteriorating'>('stable');
  
  useEffect(() => {
    const fetchAuthenticTrend = () => {
      try {
        // Use authentic company data to get consistent trend
        const companyData = { id: companyId, risk_score: riskScore, name: `Company ${companyId}` };
        const authenticData = sessionDataService.getCompanyData(companyData);
        setTrend(authenticData.trend);
      } catch (error) {
        console.log('[RiskTrend] Error fetching trend for company:', companyId);
        setTrend('stable');
      }
    };
    
    fetchAuthenticTrend();
  }, [companyId, riskScore]);
  
  if (trend === 'deteriorating') {
    return (
      <div className="flex items-center justify-center" title="Risk deteriorating">
        <TrendingUp className="h-4 w-4 text-red-500" />
      </div>
    );
  } else if (trend === 'improving') {
    return (
      <div className="flex items-center justify-center" title="Risk improving">
        <TrendingDown className="h-4 w-4 text-green-500" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center" title="Risk stable">
      <Minus className="h-4 w-4 text-gray-400" />
    </div>
  );
};

const CompanyRow = memo(({ relationship, isHovered, onRowClick, onHoverChange, searchTerm }: {
  relationship: NetworkRelationship;
  isHovered: boolean;
  onRowClick: () => void;
  onHoverChange: (isHovered: boolean) => void;
  searchTerm: string;
}) => {
  const company = relationship.relatedCompany;

  return (
    <TableRow
      className="group cursor-pointer hover:bg-muted/50 bg-white h-16"
      onClick={onRowClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-h-[40px]">
          <CompanyLogo
            companyId={company.id}
            companyName={company.name}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className={cn(
              "font-normal text-foreground text-sm leading-tight truncate max-w-[160px]",
              isHovered && "underline"
            )}>
              <HighlightText text={company.name} searchTerm={searchTerm} />
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center py-3">
        <div className="flex justify-center min-h-[40px] items-center">
          <RiskMonitoringStatusBadge companyId={company.id} riskScore={company.riskScore} />
        </div>
      </TableCell>
      <TableCell className="text-center font-medium py-3">
        <div className="min-h-[40px] flex items-center justify-center">
          {company.riskScore || "N/A"}
        </div>
      </TableCell>
      <TableCell className="text-center py-3">
        <div className="min-h-[40px] flex items-center justify-center">
          <RiskTrendIndicator companyId={company.id} riskScore={company.riskScore} />
        </div>
      </TableCell>
      <TableCell className="text-center py-3">
        <div className="flex justify-center min-h-[40px] items-center">
          <AccreditationStatusDisplay
            status={company.accreditationStatus}
            variant="pill"
            size="sm"
          />
        </div>
      </TableCell>
      <TableCell className="text-center py-3">
        <div className="invisible group-hover:visible flex items-center justify-center text-primary min-h-[40px]">
          <span className="font-medium mr-2 text-sm whitespace-nowrap">View</span>
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
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "ALL">("ALL");
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

  const { data: networkRelationships = [], isLoading } = useQuery<NetworkRelationship[]>({
    queryKey: ["/api/relationships"],
    enabled: !!user
  });

  // Initialize Fuse instance for fuzzy search
  const fuse = useMemo(() => new Fuse(networkRelationships, {
    keys: ['relatedCompany.name'],
    threshold: 0.3,
    includeMatches: true,
  }), [networkRelationships]);

  const sortCompanies = (a: NetworkRelationship, b: NetworkRelationship) => {
    if (sortField === "name") {
      return sortDirection === "asc"
        ? a.relatedCompany.name.localeCompare(b.relatedCompany.name)
        : b.relatedCompany.name.localeCompare(a.relatedCompany.name);
    }
    if (sortField === "relationshipStatus") {
      return sortDirection === "asc"
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    if (sortField === "riskScore") {
      const scoreA = a.relatedCompany.riskScore || 0;
      const scoreB = b.relatedCompany.riskScore || 0;
      return sortDirection === "asc" ? scoreA - scoreB : scoreB - scoreA;
    }
    if (sortField === "accreditationStatus") {
      return sortDirection === "asc"
        ? a.relatedCompany.accreditationStatus.localeCompare(b.relatedCompany.accreditationStatus)
        : b.relatedCompany.accreditationStatus.localeCompare(a.relatedCompany.accreditationStatus);
    }
    return 0;
  };

  // Use fuzzy search for filtering company names only
  const filteredRelationships = useMemo(() => {
    let results = networkRelationships;

    if (searchQuery) {
      const fuseResults = fuse.search(searchQuery);
      results = fuseResults.map(result => result.item);
    }

    return results
      .filter((relationship) =>
        statusFilter === "ALL" || relationship.relatedCompany.accreditationStatus === statusFilter
      )
      .sort(sortCompanies);
  }, [networkRelationships, searchQuery, statusFilter, sortField, sortDirection, fuse]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const findCompanyBySlug = (slug: string) => {
    return networkRelationships.find(r => 
      generateSlug(r.relatedCompany.name) === slug ||
      r.relatedCompany.id === parseInt(slug)
    )?.relatedCompany;
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  const totalPages = Math.ceil(filteredRelationships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRelationships = filteredRelationships.slice(startIndex, startIndex + itemsPerPage);

  useQueries({
    queries: paginatedRelationships.map(relationship => ({
      queryKey: [`company-logo-${relationship.relatedCompany.id}`],
      queryFn: async () => {
        try {
          const response = await fetch(`/api/companies/${relationship.relatedCompany.id}/logo`);
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
      enabled: !!relationship.relatedCompany.id,
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
      {/* Add tutorial manager for network page */}
      <TutorialManager tabName="network">
        <div />
      </TutorialManager>
      
      <PageTemplate
        showBreadcrumbs
      >
        <div className="space-y-6">
          <PageHeader
            title={currentCompany?.name ? `${currentCompany.name}'s Network` : "Network"}
            description="View and manage companies in your network."
            actions={
              <InviteButton
                variant="fintech"
                pulse={false}
                onClick={() => setOpenFinTechModal(true)}
              />
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

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccreditationStatus | "ALL")}>
              <SelectTrigger className="w-[200px] justify-between bg-white">
                <SelectValue className="text-left" placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {/* Primary status values */}
                <SelectItem value={AccreditationStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={AccreditationStatus.UNDER_REVIEW}>Under Review</SelectItem>
                <SelectItem value={AccreditationStatus.IN_PROCESS}>In Process</SelectItem>
                <SelectItem value={AccreditationStatus.REVOKED}>Revoked</SelectItem>
                
                {/* Legacy status values for backward compatibility */}
                <SelectItem value={AccreditationStatus.PROVISIONALLY_APPROVED}>Provisionally Approved</SelectItem>
                <SelectItem value={AccreditationStatus.IN_REVIEW}>In Review (Legacy)</SelectItem>
                <SelectItem value={AccreditationStatus.PENDING}>Pending (Legacy)</SelectItem>
                <SelectItem value={AccreditationStatus.SUSPENDED}>Suspended</SelectItem>
                <SelectItem value={AccreditationStatus.EXPIRED}>Expired</SelectItem>
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
                  <TableHead className="w-[200px]">
                    <Button
                      variant="ghost"
                      className="p-0 hover:bg-transparent text-left w-full justify-start"
                      onClick={() => handleSort("name")}
                    >
                      <span>Company</span>
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[140px]">
                    <Button
                      variant="ghost"
                      className="p-0 hover:bg-transparent text-center w-full justify-center"
                      onClick={() => handleSort("relationshipStatus")}
                    >
                      <span>Relationship Status</span>
                      {getSortIcon("relationshipStatus")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[120px]">
                    <Button
                      variant="ghost"
                      className="p-0 hover:bg-transparent text-center w-full justify-center"
                      onClick={() => handleSort("riskScore")}
                    >
                      <span>S&P DARS</span>
                      {getSortIcon("riskScore")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[100px]">Trend</TableHead>
                  <TableHead className="text-center w-[130px]">
                    <Button
                      variant="ghost"
                      className="p-0 hover:bg-transparent text-center w-full justify-center"
                      onClick={() => handleSort("accreditationStatus")}
                    >
                      <span>Accreditation</span>
                      {getSortIcon("accreditationStatus")}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[80px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[400px]">
                      <div className="flex items-center justify-center w-full h-full">
                        <LoadingSpinner size="lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRelationships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No companies found in your network
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRelationships.map((relationship) => (
                    <CompanyRow
                      key={relationship.id}
                      relationship={relationship}
                      isHovered={hoveredRow === relationship.relatedCompany.id}
                      onRowClick={() => {
                        setLocation(`/network/company/${relationship.relatedCompany.id}`);
                      }}
                      onHoverChange={(isHovered) => setHoveredRow(isHovered ? relationship.relatedCompany.id : null)}
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
                ) : filteredRelationships.length > 0 ? (
                  <>
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRelationships.length)} of {filteredRelationships.length} results
                  </>
                ) : (
                  "No results found"
                )}
              </div>

              {!isLoading && filteredRelationships.length > itemsPerPage && (
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