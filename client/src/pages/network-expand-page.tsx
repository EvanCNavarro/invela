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
import { ArrowLeft, Search, Building2, TrendingUp, Users, Shield, Info, CheckCircle } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  
  // Filter state with safe defaults (low risk + accredited)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    riskLevel: "low",
    accreditation: "accredited",
    size: "all",
    industry: "all", 
    recipientType: "all"
  });

  // Track companies being connected/connected in this session
  const [connectedCompanies, setConnectedCompanies] = useState<Map<number, ConnectedCompany>>(new Map());

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
      if (filters.accreditation === "accredited" && company.accreditation_status !== "APPROVED") return false;
      if (filters.accreditation === "pending" && company.accreditation_status !== "PENDING") return false;
    }
    
    // Industry filter (category)
    if (filters.industry !== "all" && company.category !== filters.industry) {
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
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNav />
        
        {/* Page Header with Tooltip */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/network")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Network
          </Button>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <PageHeader
                      title="Invela Trust Network"
                      description="Browse available Data Providers and expand your network via invitation"
                    />
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    This shows a curated subset of the full trust network. 
                    Not all available partners are displayed for security and performance reasons.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filter Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk Level</label>
                  <Select value={filters.riskLevel} onValueChange={(value) => updateFilter('riskLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accreditation</label>
                  <Select value={filters.accreditation} onValueChange={(value) => updateFilter('accreditation', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accredited">Accredited</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="all">All Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Size</label>
                  <Select value={filters.size} onValueChange={(value) => updateFilter('size', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="sme">SME</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="all">All Sizes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry</label>
                  <Select value={filters.industry} onValueChange={(value) => updateFilter('industry', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FinTech">FinTech</SelectItem>
                      <SelectItem value="Bank">Banking</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                      <SelectItem value="all">All Industries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Recipient</label>
                  <Select value={filters.recipientType} onValueChange={(value) => updateFilter('recipientType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment Processors</SelectItem>
                      <SelectItem value="lending">Lenders</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="all">All Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Results Count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {filteredCandidates.length} companies available
                </div>
                <span>Showing low risk accredited companies by default</span>
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
                    <TableHead>Industry</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Accreditation</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                        <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-6 w-20 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-6 w-24 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
                        <TableCell><div className="h-8 w-20 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => {
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
                            <Badge variant="secondary" className="text-xs">
                              {candidate.category}
                            </Badge>
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
                            <Badge 
                              variant={candidate.accreditation_status === "APPROVED" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {candidate.accreditation_status === "APPROVED" ? "Accredited" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{candidate.revenue_tier}</span>
                          </TableCell>
                          <TableCell className="text-right">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}