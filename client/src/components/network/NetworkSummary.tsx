import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, AlertTriangle, TrendingUp, Shield, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NetworkStats {
  currentNetworkSize: number;
  availableCount: number;
  targetCategory: string;
  expansionMessage: string;
  riskStats: {
    stable: number;
    monitoring: number;
    approaching: number;
    blocked: number;
  };
  userCompanyCategory: string;
  dataProviderCount: number;
  dataRecipientCount: number;
}

export function NetworkSummary() {
  const [, navigate] = useLocation();

  // Fetch unified risk statistics
  const { data: unifiedRiskData, isLoading: riskLoading } = useQuery({
    queryKey: ["/api/companies/risk-unified"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

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

  const { currentNetworkSize, availableCount, expansionMessage, userCompanyCategory, dataProviderCount, dataRecipientCount } = networkStats;
  
  // Use unified risk statistics instead of legacy risk data
  const unifiedRiskStats = riskStats || networkStats.riskStats || { stable: 0, monitoring: 0, approaching: 0, blocked: 0 };
  const totalRiskCompanies = unifiedRiskStats.stable + unifiedRiskStats.monitoring + unifiedRiskStats.approaching + unifiedRiskStats.blocked;

  // For Invela users, show both provider and recipient counts
  const isInvelaUser = userCompanyCategory === 'Invela';
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
      
      {/* Network Size Bento Box - Conditional width based on user type */}
      <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-36 flex flex-col justify-between ${isInvelaUser ? "flex-1" : "w-40"}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-2.5 w-2.5 text-slate-600" />
          </div>
          <div className="text-xs font-semibold text-slate-900">
            Network Overview
          </div>
        </div>
        
        {isInvelaUser ? (
          /* For Invela: Show both providers and recipients side by side */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center justify-around w-full">
              {/* Data Providers Section */}
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {formatNetworkSize(dataProviderCount)}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Data Providers
                </div>
              </div>
              
              {/* Data Recipients Section */}
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {formatNetworkSize(dataRecipientCount)}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  Data Recipients
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* For Banks/FinTech: Show traditional network size */
          <div className="text-center flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatNetworkSize(currentNetworkSize)}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {entityType}
            </div>
          </div>
        )}
      </div>

      {/* Risk Overview Bento Box - Always flex-1 for remaining space */}
      {totalRiskCompanies > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-36 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-2.5 w-2.5 text-slate-600" />
            </div>
            <div className="text-xs font-semibold text-slate-900">
              Risk Overview
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-2">
            {/* Risk Distribution Bar - Modern Fintech Style */}
            <div className="flex bg-slate-50 rounded h-4 overflow-hidden border border-slate-200">
              {riskStats.stable > 0 && (
                <div 
                  className="bg-emerald-500 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.stable / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
              {riskStats.monitoring > 0 && (
                <div 
                  className="bg-amber-500 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.monitoring / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
              {riskStats.approaching > 0 && (
                <div 
                  className="bg-orange-500 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.approaching / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
              {riskStats.blocked > 0 && (
                <div 
                  className="bg-red-500 transition-all duration-700"
                  style={{ 
                    width: `${totalRiskCompanies > 0 ? (riskStats.blocked / totalRiskCompanies) * 100 : 0}%`
                  }}
                />
              )}
            </div>
            
            {/* Centered Legend */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-slate-600 font-medium">{riskStats.stable} Stable</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-slate-600 font-medium">{riskStats.monitoring} Monitoring</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-slate-600 font-medium">{riskStats.approaching} Approaching Block</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-slate-600 font-medium">{riskStats.blocked} Blocked</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Expansion Call-to-Action - Only show for Banks and FinTech */}
      {!isInvelaUser && availableCount > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-300 hover:border-blue-500 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out flex-1 h-36 group cursor-pointer flex flex-col justify-between"
             onClick={() => navigate("/network/expand")}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-900">
              Expand Your Network
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-600 font-bold group-hover:text-blue-700 transition-colors duration-300">
              View More
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-300 ease-in-out" />
            </div>
          </div>
          
          <div className="text-center flex-1 flex flex-col justify-center">
            <div className="text-lg font-bold text-blue-600 mb-1">
              {formatNetworkSize(availableCount)} Available {availableEntityType.replace(/data providers/i, 'Data Providers').replace(/data recipients/i, 'Data Recipients')}
            </div>
            <div className="text-xs text-slate-600 leading-tight font-medium">
              Browse the Invela Trust Network's available Data Providers and expand your network via invitation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}