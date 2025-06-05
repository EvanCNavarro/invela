import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Network, Users, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

interface NetworkStats {
  currentNetworkSize: number;
  availableCount: number;
  targetCategory: string;
  expansionMessage: string;
  riskStats: {
    high: number;
    medium: number;
    low: number;
  };
  userCompanyCategory: string;
}

export function NetworkSummary() {
  const [, navigate] = useLocation();

  // Fetch network statistics
  const { data: networkStats, isLoading } = useQuery<NetworkStats>({
    queryKey: ["/api/network/stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!networkStats) {
    return null;
  }

  const { currentNetworkSize, availableCount, expansionMessage, riskStats } = networkStats;
  const totalRiskCompanies = riskStats.high + riskStats.medium + riskStats.low;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Network Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Network Size */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Current Network</span>
          </div>
          <span className="font-semibold text-lg">{currentNetworkSize}</span>
        </div>

        {/* Risk Distribution */}
        {totalRiskCompanies > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Risk Distribution</span>
            <div className="flex gap-2 flex-wrap">
              {riskStats.high > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {riskStats.high} High Risk
                </Badge>
              )}
              {riskStats.medium > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                  {riskStats.medium} Medium Risk
                </Badge>
              )}
              {riskStats.low > 0 && (
                <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                  {riskStats.low} Low Risk
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Expansion Opportunity */}
        {availableCount > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Expansion Opportunity</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {availableCount} {expansionMessage}
            </p>
            <Button 
              onClick={() => navigate("/network/expand")}
              size="sm" 
              className="w-full"
            >
              Explore Expansion
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* No Expansion Available */}
        {availableCount === 0 && (
          <div className="border-t pt-4">
            <div className="text-center text-sm text-muted-foreground">
              No additional expansion opportunities available
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}