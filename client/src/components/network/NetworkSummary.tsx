import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, AlertTriangle, TrendingUp, Shield, CheckCircle } from "lucide-react";
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

  // Fetch current company data to determine type
  const { data: currentCompany } = useQuery({
    queryKey: ["/api/companies/current"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
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

  const { currentNetworkSize, availableCount, expansionMessage, riskStats, userCompanyCategory } = networkStats;
  const totalRiskCompanies = riskStats.high + riskStats.medium + riskStats.low;

  // Determine what type of entities to show based on company category
  const isDataProvider = userCompanyCategory === 'Bank' || userCompanyCategory === 'FinTech';
  const entityType = isDataProvider ? 'Data Recipients' : 'Data Providers';
  const availableEntityType = isDataProvider ? 'data recipients' : 'data providers';

  // Format large numbers with proper scaling
  const formatNetworkSize = (num: number) => {
    if (num >= 100000) return `${(num / 1000).toFixed(0)}K`;
    if (num >= 10000) return `${(num / 1000).toFixed(1)}K`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex items-start gap-4">
      
      {/* Network Size Bento Box - Square - Even Slimmer */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 w-40 h-36 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-2.5 w-2.5 text-slate-600" />
          </div>
          <div className="text-xs font-semibold text-slate-900">
            Network Size
          </div>
        </div>
        
        <div className="text-center flex-1 flex flex-col justify-center">
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {formatNetworkSize(currentNetworkSize)}
          </div>
          <div className="text-xs text-slate-600">
            {entityType}
          </div>
        </div>
      </div>

      {/* Risk Overview Bento Box - Even Slimmer */}
      {totalRiskCompanies > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 h-36 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-2.5 w-2.5 text-slate-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900">
              Risk Overview
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-2">
            {/* Risk Distribution Bar - Muted Colors */}
            <div className="flex bg-slate-100 rounded-lg h-5 overflow-hidden">
              {riskStats.low > 0 && (
                <div 
                  className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.low / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
              {riskStats.medium > 0 && (
                <div 
                  className="bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.medium / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
              {riskStats.high > 0 && (
                <div 
                  className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.high / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
            </div>
            
            {/* Centered Legend */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-sm" />
                <span className="text-slate-700">{riskStats.low} Stable</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-sm" />
                <span className="text-slate-700">{riskStats.medium} Monitoring</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-sm" />
                <span className="text-slate-700">{riskStats.high} Blocked</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Expansion Call-to-Action - Improved */}
      {availableCount > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 flex-1 h-36 group cursor-pointer flex flex-col justify-between"
             onClick={() => navigate("/network/expand")}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-900">
              Expand Your Network
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-600 font-bold group-hover:text-blue-700 transition-colors">
              View More
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </div>
          </div>
          
          <div className="text-center flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatNetworkSize(availableCount)}
            </div>
            <div className="text-xs text-slate-600 leading-tight">
              Available {availableEntityType}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}