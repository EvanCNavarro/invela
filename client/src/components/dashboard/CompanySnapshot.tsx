/**
 * ========================================
 * Company Snapshot Widget - Compact Overview
 * ========================================
 * 
 * Clean, compact company overview showing essential information
 * for the currently logged-in company in a single column layout.
 */

import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Shield,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { Widget } from "@/components/dashboard/Widget";
import { Badge } from "@/components/ui/badge";

interface CompanySnapshotProps {
  companyData: any;
  onToggle: () => void;
  isVisible: boolean;
}

export function CompanySnapshot({ 
  companyData, 
  onToggle, 
  isVisible
}: CompanySnapshotProps) {
  // Fetch network relationships
  const { data: relationships, isLoading: isLoadingRelationships } = useQuery<any[]>({
    queryKey: ["/api/relationships"],
    enabled: !!companyData?.id
  });

  const networkCount = relationships?.length || 0;
  const riskScore = companyData?.risk_score || companyData?.riskScore || 0;
  const accreditationStatus = companyData?.accreditation_status || 'PENDING';

  const getRiskStatus = (score: number) => {
    if (score >= 70) return { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-50' };
    if (score >= 50) return { label: 'Medium Risk', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (score >= 35) return { label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-50' };
    return { label: 'Stable', color: 'text-blue-600', bg: 'bg-blue-50' };
  };

  const riskStatus = getRiskStatus(riskScore);

  const getAccreditationBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
      case 'PENDING':
        return { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' };
      case 'REJECTED':
        return { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' };
      default:
        return { variant: 'secondary' as const, icon: Clock, color: 'text-gray-600' };
    }
  };

  const accreditationBadge = getAccreditationBadge(accreditationStatus);

  // Get persona-based colors for avatar and icons
  const getPersonaColors = (category: string) => {
    switch (category) {
      case 'Invela':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          iconColor: 'text-blue-600'
        };
      case 'Bank':
        return {
          gradient: 'from-purple-500 to-violet-600',
          iconColor: 'text-purple-600'
        };
      case 'FinTech':
      default:
        return {
          gradient: 'from-green-500 to-emerald-600',
          iconColor: 'text-green-600'
        };
    }
  };
  
  const personaColors = getPersonaColors(companyData?.category || 'FinTech');

  if (isLoadingRelationships) {
    return (
      <Widget
        title="Company Overview"
        icon={<Building2 className="h-5 w-5 text-gray-700" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
      >
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget
      title="Company Overview"
      icon={<Building2 className={`h-5 w-5 ${personaColors.iconColor}`} />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
    >
      <div className="space-y-4">
        {/* Company Header with Logo */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="flex items-center gap-4">
            {/* Company Logo/Avatar */}
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${personaColors.gradient} flex items-center justify-center text-white font-semibold text-lg shadow-sm`}>
                {(companyData?.name || 'C')[0].toUpperCase()}
              </div>
            </div>
            
            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <h3 className="widget-title truncate mb-1">
                {companyData?.name || 'Company Name'}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="widget-text">
                  {companyData?.category || 'FinTech'}
                </Badge>
                {/* New Alerts Badge */}
                <Badge variant="secondary" className="widget-text bg-orange-100 text-orange-800 border-orange-200">
                  0 New Alerts
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid - 2x2 Layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Risk Score */}
          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className={`h-4 w-4 ${personaColors.iconColor}`} />
              <span className="widget-text">Risk Score</span>
            </div>
            <div className="space-y-1">
              <div className="widget-number text-2xl">{riskScore}</div>
              <Badge 
                variant="secondary" 
                className={`widget-text ${riskStatus.color} ${riskStatus.bg}`}
              >
                {riskStatus.label}
              </Badge>
            </div>
          </div>

          {/* Network Size */}
          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Users className={`h-4 w-4 ${personaColors.iconColor}`} />
              <span className="widget-text">Network</span>
            </div>
            <div className="space-y-1">
              <div className="widget-number text-2xl">{networkCount}</div>
              <div className="widget-text text-gray-500">companies</div>
            </div>
          </div>

          {/* Accreditation Status */}
          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <accreditationBadge.icon className={`h-4 w-4 ${personaColors.iconColor}`} />
              <span className="widget-text">Accreditation</span>
            </div>
            <div className="space-y-1">
              <Badge variant={accreditationBadge.variant} className="widget-text">
                {accreditationStatus}
              </Badge>
              <div className="widget-text text-gray-500 text-xs">
                Expires: Dec 2025
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className={`h-4 w-4 ${personaColors.iconColor}`} />
              <span className="widget-text">Last Update</span>
            </div>
            <div className="space-y-1">
              <div className="widget-text">Today</div>
              <div className="widget-text text-gray-500 text-xs">
                Risk assessment
              </div>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}