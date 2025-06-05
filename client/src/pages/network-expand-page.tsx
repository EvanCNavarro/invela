import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BreadcrumbNav } from "@/components/dashboard/BreadcrumbNav";
import { Search, Building2, TrendingUp, Users, Shield, CheckCircle, X, FilterX } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAccreditationStatusLabel } from "@/lib/company-utils";
import { cn } from "@/lib/utils";

interface ExpansionCandidate {
  id: number;
  name: string;
  category: string;
  risk_score: number;
  revenue_tier: string;
  accreditation_status: string;
  description?: string;
}

interface ExpansionData {
  candidates: ExpansionCandidate[];
  totalAvailable: number;
  targetCategory: string;
  expansionMessage: string;
}

interface FilterState {
  search: string;
  riskLevel: string;
  accreditation: string;
  size: string;
  industry: string;
  recipientType: string;
}

interface ConnectedCompany {
  id: number;
  status: 'connecting' | 'connected';
}

export default function NetworkExpandPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter state with safe defaults (low risk + approved)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    riskLevel: "low",
    accreditation: "approved",
    size: "all",
    industry: "all", 
    recipientType: "all"
  });

  // Track companies being connected/connected in this session
  const [connectedCompanies, setConnectedCompanies] = useState<Map<number, ConnectedCompany>>(new Map());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch expansion candidates
  const { data: expansionData, isLoading } = useQuery<ExpansionData>({
    queryKey: ["/api/network/expansion-candidates"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Connection mutation for creating company relationships
  const connectMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return apiRequest(`/api/network/connect`, {
        method: 'POST',
        body: { companyId }
      });
    },
    onMutate: (companyId) => {
      // Optimistic update: mark as connecting
      setConnectedCompanies(prev => new Map(prev.set(companyId, { id: companyId, status: 'connecting' })));
    },
    onSuccess: (data, companyId) => {
      // Update to connected status
      setConnectedCompanies(prev => new Map(prev.set(companyId, { id: companyId, status: 'connected' })));
      
      toast({
        title: "Connection Successful",
        description: "Company has been added to your network.",
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/network/expansion-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/stats"] });
    },
    onError: (error, companyId) => {
      // Remove from connected companies on error
      setConnectedCompanies(prev => {
        const newMap = new Map(prev);
        newMap.delete(companyId);
        return newMap;
      });
      
      toast({
        title: "Connection Failed",
        description: "Unable to connect to company. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Filter candidates based on current filter state
  const filteredCandidates = expansionData?.candidates.filter(company => {
    // Remove already connected companies from view
    if (connectedCompanies.has(company.id) && connectedCompanies.get(company.id)?.status === 'connected') {
      return false;
    }
    
    // Search filter
    if (filters.search && !company.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Risk level filter
    const riskScore = company.risk_score || 0;
    if (filters.riskLevel !== "all") {
      if (filters.riskLevel === "low" && riskScore > 33) return false;
      if (filters.riskLevel === "medium" && (riskScore <= 33 || riskScore > 66)) return false;
      if (filters.riskLevel === "high" && riskScore <= 66) return false;
    }
    
    // Accreditation filter
    if (filters.accreditation !== "all") {
      if (filters.accreditation === "approved" && company.accreditation_status !== "APPROVED") return false;
      if (filters.accreditation === "under-review" && company.accreditation_status !== "UNDER_REVIEW") return false;
      if (filters.accreditation === "in-process" && company.accreditation_status !== "IN_PROCESS") return false;
      if (filters.accreditation === "revoked" && company.accreditation_status !== "REVOKED") return false;
      if (filters.accreditation === "expired" && company.accreditation_status !== "EXPIRED") return false;
    }
    
    // Company size filter
    if (filters.size !== "all" && company.revenue_tier !== filters.size) {
      return false;
    }
    
    return true;
  }) || [];

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Medium Risk";
    return "Low Risk";
  };

  // Helper functions for risk assessment
  const isConnectEnabled = (candidate: ExpansionCandidate) => {
    const riskScore = candidate.risk_score || 0;
    const isLowRisk = riskScore <= 33;
    const isAccredited = candidate.accreditation_status === "APPROVED";
    return isLowRisk && isAccredited;
  };

  const handleConnect = (companyId: number) => {
    console.log('[NetworkExpansion] Attempting to connect to company:', companyId);
    connectMutation.mutate(companyId);
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNav />
        
        {/* Page Header */}
        <PageHeader
          title="Invela Trust Network Search"
          description="Browse available Data Providers and expand your network via invitation."
        />

        {/* Filter Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Filter Row - Single Row Layout */}
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFilters({
                      search: "",
                      riskLevel: "low",
                      accreditation: "approved", 
                      size: "all",
                      industry: "all",
                      recipientType: "all"
                    });
                    setCurrentPage(1);
                  }}
                  disabled={!(filters.riskLevel !== "low" || filters.accreditation !== "approved" || filters.size !== "all")}
                  className={cn(
                    "h-10 w-10",
                    (filters.riskLevel !== "low" || filters.accreditation !== "approved" || filters.size !== "all") ? "bg-primary hover:bg-primary/90 text-white hover:text-white" : "bg-white border border-input rounded-md",
                    !(filters.riskLevel !== "low" || filters.accreditation !== "approved" || filters.size !== "all") && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <FilterX className="h-4 w-4" />
                  <span className="sr-only">Clear filters</span>
                </Button>

                <Select value={filters.riskLevel} onValueChange={(value) => updateFilter('riskLevel', value)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Risk Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Status</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.accreditation} onValueChange={(value) => updateFilter('accreditation', value)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Accreditation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accreditation</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="in-process">In Process</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Search Bar - inline on desktop, responsive on mobile */}
                <div className="relative flex-1 max-w-sm ml-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Network"
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="pl-10"
                  />
                </div>

              </div>

            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Company</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Accreditation</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeleton rows
                    [...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                            <div className="space-y-1">
                              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-6 w-24 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell className="text-center"><div className="h-8 w-20 bg-muted rounded animate-pulse mx-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedCandidates.length > 0 ? (
                    paginatedCandidates.map((candidate) => {
                      const connectionState = connectedCompanies.get(candidate.id);
                      const connectEnabled = isConnectEnabled(candidate);
                      
                      return (
                        <TableRow key={candidate.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <CompanyLogo 
                                companyId={candidate.id}
                                companyName={candidate.name}
                                size="sm"
                                className="h-8 w-8"
                              />
                              <div>
                                <div className="font-medium">{candidate.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  Data Recipient
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getRiskColor(candidate.risk_score)}`}
                            >
                              {getRiskLevel(candidate.risk_score)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {getAccreditationStatusLabel(candidate.accreditation_status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {candidate.revenue_tier === "extra-large" ? "X-Large" : 
                               candidate.revenue_tier === "small" ? "Small" :
                               candidate.revenue_tier === "medium" ? "Medium" :
                               candidate.revenue_tier === "large" ? "Large" :
                               candidate.revenue_tier}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {connectionState?.status === 'connecting' ? (
                              <Button size="sm" disabled className="w-20">
                                Connecting...
                              </Button>
                            ) : connectionState?.status === 'connected' ? (
                              <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Connected</span>
                              </div>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleConnect(candidate.id)}
                                        disabled={!connectEnabled}
                                        className="w-20"
                                      >
                                        Connect
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!connectEnabled && (
                                    <TooltipContent>
                                      <p>Only low risk accredited companies can be connected</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                          No Companies Found
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {filters.search ? 
                            "Try adjusting your search criteria to find more companies." :
                            "No companies match your current filter settings."
                          }
                        </p>
                        {filters.search && (
                          <Button
                            variant="outline"
                            onClick={() => updateFilter('search', '')}
                          >
                            Clear Search
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Loading results..."
                ) : filteredCandidates.length > 0 ? (
                  <>
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of {filteredCandidates.length} results
                  </>
                ) : (
                  "No results found"
                )}
              </div>

              {!isLoading && filteredCandidates.length > itemsPerPage && (
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}