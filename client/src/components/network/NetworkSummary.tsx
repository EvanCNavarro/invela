import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Network, AlertTriangle, TrendingUp, Shield, CheckCircle } from "lucide-react";
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
    <div className="flex items-start gap-6">
      
      {/* Network Size Bento Box - Square */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-200 w-56 h-56 flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Network className="h-4 w-4 text-slate-600" />
          </div>
          <div className="text-base font-semibold text-slate-900">
            Network Size
          </div>
        </div>
        
        <div className="text-center flex-1 flex flex-col justify-center">
          <div className="text-5xl font-bold text-slate-900 mb-3">
            {formatNetworkSize(currentNetworkSize)}
          </div>
          <div className="text-sm text-slate-600">
            Data Recipients
          </div>
        </div>
      </div>

      {/* Risk Overview Bento Box */}
      {totalRiskCompanies > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 h-56 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-slate-600" />
            </div>
            <div className="text-base font-semibold text-slate-900">
              Risk Overview
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {/* Risk Distribution Bar - Taller */}
            <div className="flex bg-slate-100 rounded-lg h-6 overflow-hidden">
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

      {/* Network Expansion Call-to-Action */}
      {availableCount > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-all duration-200 flex-1 h-56 group cursor-pointer flex flex-col"
             onClick={() => navigate("/network/expand")}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-semibold text-slate-900">
              Expand Your Network
            </div>
            <ChevronRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <div className="text-3xl font-bold text-blue-600">
              {formatNetworkSize(availableCount)}
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              Companies available to join your network. Click to view and connect with potential partners.
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200/50">
            <div className="text-xs text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
              Click to View More →
            </div>
          </div>
        </div>
      )}
    </div>
  );
}