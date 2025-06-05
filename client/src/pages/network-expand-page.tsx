import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Building2, TrendingUp, Users, Shield } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";

interface ExpansionCandidate {
  id: number;
  name: string;
  category: string;
  risk_score: number;
  revenue_tier: string;
  description?: string;
}

interface ExpansionData {
  candidates: ExpansionCandidate[];
  totalAvailable: number;
  targetCategory: string;
  expansionMessage: string;
}

export default function NetworkExpandPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch expansion candidates
  const { data: expansionData, isLoading } = useQuery<ExpansionData>({
    queryKey: ["/api/network/expansion-candidates"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const filteredCandidates = expansionData?.candidates.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
          <PageHeader
            title="Network Expansion"
            description={expansionData ? 
              `${expansionData.totalAvailable} ${expansionData.expansionMessage}` : 
              "Discover new partnership opportunities"
            }
          />
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expansion candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {filteredCandidates.length} candidates
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Expansion Candidates Grid */}
        {!isLoading && expansionData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CompanyLogo 
                        companyId={candidate.id}
                        companyName={candidate.name}
                        size="sm"
                        className="h-10 w-10"
                      />
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">
                          {candidate.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{candidate.category}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRiskColor(candidate.risk_score)}`}
                    >
                      {getRiskLevel(candidate.risk_score)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Risk Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                    </div>
                    <span className="font-semibold">{candidate.risk_score}/100</span>
                  </div>

                  {/* Revenue Tier */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Revenue Tier</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {candidate.revenue_tier}
                    </Badge>
                  </div>

                  {/* Description */}
                  {candidate.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {candidate.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/company/${candidate.id}`)}
                      className="flex-1"
                    >
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredCandidates.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                No Expansion Candidates Found
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 
                  "Try adjusting your search criteria to find more candidates." :
                  "All available expansion opportunities have been explored."
                }
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}