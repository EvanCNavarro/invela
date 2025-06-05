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
          
          {/* Left Section - Network Overview (Connected with Risk Section) */}
          <div className="flex items-center">
            <div className="flex items-center bg-slate-50/80 border border-slate-200/60 rounded-2xl px-6 py-4 gap-6">
              {/* Network Size Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-600" />
                  <div className="text-sm font-medium text-slate-700">Network Size</div>
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

              {/* Divider */}
              <div className="w-px h-16 bg-slate-200" />

              {/* Risk Distribution Section */}
              {totalRiskCompanies > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-600" />
                    <div className="text-sm font-medium text-slate-700">Risk Overview</div>
                  </div>
                  
                  {/* Enhanced Horizontal Bar Chart - Fixed Width */}
                  <div className="space-y-2">
                    <div className="flex rounded-lg overflow-hidden bg-slate-100 h-6 w-48 shadow-inner">
                      {riskStats.low > 0 && (
                        <div 
                          className="bg-emerald-500 transition-all duration-700 flex items-center justify-center rounded-l-lg"
                          style={{ 
                            width: `${totalRiskCompanies > 0 ? (riskStats.low / totalRiskCompanies) * 100 : 0}%`,
                            minWidth: riskStats.low > 0 ? '20px' : '0px'
                          }}
                        >
                          {riskStats.low > 0 && (
                            <span className="text-xs font-bold text-white">{riskStats.low}</span>
                          )}
                        </div>
                      )}
                      {riskStats.medium > 0 && (
                        <div 
                          className="bg-amber-500 transition-all duration-700 flex items-center justify-center"
                          style={{ 
                            width: `${totalRiskCompanies > 0 ? (riskStats.medium / totalRiskCompanies) * 100 : 0}%`,
                            minWidth: riskStats.medium > 0 ? '20px' : '0px'
                          }}
                        >
                          {riskStats.medium > 0 && (
                            <span className="text-xs font-bold text-white">{riskStats.medium}</span>
                          )}
                        </div>
                      )}
                      {riskStats.high > 0 && (
                        <div 
                          className="bg-red-500 transition-all duration-700 flex items-center justify-center rounded-r-lg"
                          style={{ 
                            width: `${totalRiskCompanies > 0 ? (riskStats.high / totalRiskCompanies) * 100 : 0}%`,
                            minWidth: riskStats.high > 0 ? '20px' : '0px'
                          }}
                        >
                          {riskStats.high > 0 && (
                            <span className="text-xs font-bold text-white">{riskStats.high}</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Risk Legend */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-sm" />
                        <span className="text-slate-700 font-medium">Stable</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-amber-500 rounded-sm shadow-sm" />
                        <span className="text-slate-700 font-medium">Monitoring</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-red-500 rounded-sm shadow-sm" />
                        <span className="text-slate-700 font-medium">Blocked</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Network Expansion */}
          {availableCount > 0 && (
            <div className="flex flex-col items-end space-y-3 max-w-xs">
              {/* Explanatory Text */}
              <div className="text-right space-y-1">
                <div className="text-sm font-medium text-slate-700">
                  {formatNetworkSize(availableCount)} companies available
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Expand your network by inviting these data recipients to connect
                </div>
              </div>
              
              {/* AI-Inspired Call-to-Action Button */}
              <div className="relative group">
                {/* Subtle AI-inspired outer glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-300/20 via-blue-400/20 to-purple-400/20 rounded-xl blur opacity-40 group-hover:opacity-60 transition-all duration-500" />
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/15 via-blue-500/15 to-purple-500/15 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-all duration-300" />
                
                {/* Button container with soft muted interior */}
                <div className="relative bg-gradient-to-br from-slate-50/90 via-blue-50/30 to-indigo-50/40 backdrop-blur-sm rounded-xl border border-slate-200/40 shadow-sm">
                  <Button 
                    onClick={() => navigate("/network/expand")}
                    className="relative w-full bg-transparent hover:bg-white/30 text-slate-700 hover:text-slate-800 border-0 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 group-hover:scale-[1.01] shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <span>Expand Network</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}