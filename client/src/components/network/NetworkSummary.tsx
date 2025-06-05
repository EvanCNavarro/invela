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
      
      <div className="relative px-8 py-6">
        <div className="flex items-center justify-between gap-8">
          
          {/* Left Section - Network Overview */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
                  <Network className="h-5 w-5 text-slate-600" />
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl blur opacity-30" />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatNetworkSize(currentNetworkSize)}
                </div>
                <div className="text-sm font-medium text-slate-600">
                  Data Recipients
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section - Risk Distribution */}
          {totalRiskCompanies > 0 && (
            <div className="flex items-center gap-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700 mb-2">Risk Overview</div>
                
                {/* Horizontal Bar Chart */}
                <div className="flex items-center gap-3">
                  <div className="flex rounded-lg overflow-hidden bg-slate-100 h-3 w-32">
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
                  
                  {/* Risk Legend */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-slate-600 font-medium">{riskStats.low}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="text-slate-600 font-medium">{riskStats.medium}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-slate-600 font-medium">{riskStats.high}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Section - Expansion Call-to-Action */}
          {availableCount > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right space-y-1">
                <div className="text-lg font-semibold text-slate-900">
                  {formatNetworkSize(availableCount)}
                </div>
                <div className="text-sm text-slate-600">
                  Available to connect
                </div>
              </div>
              
              {/* Enhanced CTA Button with landing page styling */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-xl blur-sm opacity-25 group-hover:opacity-40 transition-all duration-300" />
                <Button 
                  onClick={() => navigate("/network/expand")}
                  className="relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl border-0 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 group-hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    Expand Network
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}