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

  if (isLoadingRelationships) {
    return (
      <Widget
        title="Company Overview"
        icon={<Building2 className="h-5 w-5" />}
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
      icon={<Building2 className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
    >
      <div className="space-y-4">
        {/* Company Name & Category */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="space-y-2">
            <h3 className="widget-title text-gray-900 truncate">
              {companyData?.name || 'Company Name'}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {companyData?.category || 'FinTech'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          {/* Risk Score */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-700" />
              <span className="widget-text">Risk Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="widget-number">{riskScore}</span>
              <Badge 
                variant="secondary" 
                className={`text-xs ${riskStatus.color} ${riskStatus.bg}`}
              >
                {riskStatus.label}
              </Badge>
            </div>
          </div>

          {/* Network Size */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-700" />
              <span className="widget-text">Network</span>
            </div>
            <span className="widget-number">{networkCount} companies</span>
          </div>

          {/* Accreditation Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-2">
              <accreditationBadge.icon className={`h-4 w-4 ${accreditationBadge.color}`} />
              <span className="widget-text">Status</span>
            </div>
            <Badge variant={accreditationBadge.variant} className="text-xs">
              {accreditationStatus}
            </Badge>
          </div>
        </div>
      </div>
    </Widget>
  );
}