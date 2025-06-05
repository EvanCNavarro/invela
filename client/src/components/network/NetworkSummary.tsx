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

  // Format large numbers with proper scaling
  const formatNetworkSize = (num: number) => {
    if (num >= 100000) return `${(num / 1000).toFixed(0)}K`;
    if (num >= 10000) return `${(num / 1000).toFixed(1)}K`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 pointer-events-none" />
      
      <div className="relative px-6 py-6">
        <div className="flex items-start gap-4">
          
          {/* Network Size Bento Box - Square */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 w-48 h-48 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-base font-semibold text-slate-900">
                Network Size
              </div>
            </div>
            
            <div className="text-center flex-1 flex flex-col justify-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {formatNetworkSize(currentNetworkSize)}
              </div>
              <div className="text-sm text-slate-600">
                data recipients
              </div>
            </div>
          </div>

          {/* Risk Overview Bento Box */}
          {totalRiskCompanies > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 h-48 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-base font-semibold text-slate-900">
                  Risk Overview
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-4">
                {/* Risk Distribution Bar */}
                <div className="flex bg-slate-100 rounded-lg h-3 overflow-hidden">
                  {riskStats.low > 0 && (
                    <div 
                      className="bg-emerald-500 transition-all duration-700"
                      style={{ 
                        width: `${totalRiskCompanies > 0 ? (riskStats.low / totalRiskCompanies) * 100 : 0}%`
                      }}
                    />
                  )}
                  {riskStats.medium > 0 && (
                    <div 
                      className="bg-amber-500 transition-all duration-700"
                      style={{ 
                        width: `${totalRiskCompanies > 0 ? (riskStats.medium / totalRiskCompanies) * 100 : 0}%`
                      }}
                    />
                  )}
                  {riskStats.high > 0 && (
                    <div 
                      className="bg-red-500 transition-all duration-700"
                      style={{ 
                        width: `${totalRiskCompanies > 0 ? (riskStats.high / totalRiskCompanies) * 100 : 0}%`
                      }}
                    />
                  )}
                </div>
                
                {/* Compact Legend */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                    <span className="text-slate-700">{riskStats.low} Stable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
                    <span className="text-slate-700">{riskStats.medium} Monitoring</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                    <span className="text-slate-700">{riskStats.high} Blocked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Network Expansion Bento Box */}
          {availableCount > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex-1 h-48 group cursor-pointer flex flex-col justify-between"
                 onClick={() => navigate("/network/expand")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                  <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
                <div className="text-base font-semibold text-slate-900">
                  Expand Network
                </div>
              </div>
              
              <div className="text-center flex-1 flex flex-col justify-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {formatNetworkSize(availableCount)}
                </div>
                <div className="text-sm text-slate-600">
                  companies available
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}