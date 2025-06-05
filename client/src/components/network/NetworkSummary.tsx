import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Network, Users, TrendingUp, Shield, AlertTriangle, CheckCircle } from "lucide-react";
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

  // Fetch network statistics with authentic data
  const { data: networkStats, isLoading } = useQuery<NetworkStats>({
    queryKey: ["/api/network/stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Network className="h-4 w-4 text-blue-600" />
            </div>
            Network Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded-lg w-2/3"></div>
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
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Network className="h-4 w-4 text-white" />
          </div>
          Network Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Main Network Metrics */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Connected Partners</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{currentNetworkSize}</div>
            <div className="text-xs text-slate-500">Active relationships</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">Expansion Ready</span>
            </div>
            <div className="text-3xl font-bold text-emerald-600">{availableCount}</div>
            <div className="text-xs text-slate-500">Available opportunities</div>
          </div>
        </div>

        {/* Risk Distribution */}
        {totalRiskCompanies > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Risk Distribution</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <div className="text-lg font-semibold text-red-700">{riskStats.high}</div>
                  <div className="text-xs text-red-600">High Risk</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <Shield className="h-4 w-4 text-amber-600" />
                <div>
                  <div className="text-lg font-semibold text-amber-700">{riskStats.medium}</div>
                  <div className="text-xs text-amber-600">Medium Risk</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <div>
                  <div className="text-lg font-semibold text-emerald-700">{riskStats.low}</div>
                  <div className="text-xs text-emerald-600">Low Risk</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expansion Action */}
        {availableCount > 0 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Ready to Expand</span>
                </div>
                <p className="text-sm text-blue-700">
                  {availableCount} {expansionMessage}
                </p>
              </div>
              <Button 
                onClick={() => navigate("/network/expand")}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                size="sm"
              >
                Explore
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* No Expansion State */}
        {availableCount === 0 && currentNetworkSize === 0 && (
          <div className="text-center p-6 rounded-lg bg-slate-50 border border-slate-200">
            <Network className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-600 mb-1">Network Setup Required</div>
            <div className="text-xs text-slate-500">Connect with partners to build your network</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}