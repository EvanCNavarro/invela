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

        {/* Risk Distribution with Visual Graph */}
        {totalRiskCompanies > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">Risk Distribution</span>
            </div>
            
            {/* Mini Bar Chart */}
            <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex">
                {/* Low Risk Bar */}
                <div 
                  className="bg-emerald-500 flex items-center justify-center transition-all duration-500"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.low / totalRiskCompanies) * 100 : 0}%`,
                    minWidth: riskStats.low > 0 ? '8px' : '0px'
                  }}
                >
                  {riskStats.low > 0 && (
                    <span className="text-xs font-semibold text-white">{riskStats.low}</span>
                  )}
                </div>
                
                {/* Medium Risk Bar */}
                <div 
                  className="bg-amber-500 flex items-center justify-center transition-all duration-500"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.medium / totalRiskCompanies) * 100 : 0}%`,
                    minWidth: riskStats.medium > 0 ? '8px' : '0px'
                  }}
                >
                  {riskStats.medium > 0 && (
                    <span className="text-xs font-semibold text-white">{riskStats.medium}</span>
                  )}
                </div>
                
                {/* High Risk Bar */}
                <div 
                  className="bg-red-500 flex items-center justify-center transition-all duration-500"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.high / totalRiskCompanies) * 100 : 0}%`,
                    minWidth: riskStats.high > 0 ? '8px' : '0px'
                  }}
                >
                  {riskStats.high > 0 && (
                    <span className="text-xs font-semibold text-white">{riskStats.high}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Legend */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-emerald-700 font-medium">{riskStats.low} Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className="text-amber-700 font-medium">{riskStats.medium} Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-red-700 font-medium">{riskStats.high} High</span>
              </div>
            </div>
          </div>
        )}

        {/* Unified Expansion Call-to-Action */}
        {availableCount > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-1">
            <div className="bg-white rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Expand Network Reach</div>
                      <div className="text-xs text-slate-500">{availableCount} companies ready to connect</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {availableCount} {expansionMessage}
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/network/expand")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-6 py-3 rounded-lg font-semibold"
                  size="lg"
                >
                  Expand Network
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
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