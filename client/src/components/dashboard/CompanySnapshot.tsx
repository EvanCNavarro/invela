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
  Clock,
  ArrowRight
} from "lucide-react";
import { Widget } from "@/components/dashboard/Widget";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();
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
  
  // Get company role based on category
  const getCompanyRole = (category: string) => {
    switch (category) {
      case 'Invela':
        return 'System Admin';
      case 'Bank':
        return 'Data Provider';
      case 'FinTech':
      default:
        return 'Data Recipient';
    }
  };
  
  // Calculate days until expiration
  const getExpirationInfo = () => {
    const expirationDate = new Date('2025-12-31'); // Using the December 2025 date
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `Expires in ${diffDays} days`;
    } else {
      return 'Expired';
    }
  };

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
        {/* Compact Company Header - Clickable */}
        <button 
          onClick={() => setLocation(`/network/company/${companyData?.id || 1}`)}
          className="w-full p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 hover:border-blue-200 transition-all duration-200 group"
          title="View company profile"
        >
          <div className="flex items-center gap-3">
            {/* Smaller Company Logo/Avatar */}
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${personaColors.gradient} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                {(companyData?.name || 'C')[0].toUpperCase()}
              </div>
            </div>
            
            {/* Company Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <h3 className="widget-title truncate">
                  {companyData?.name || 'Company Name'}
                </h3>
                <ArrowRight className="h-4 w-4 text-blue-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
              <div className="widget-text text-gray-600 text-sm">
                {getCompanyRole(companyData?.category || 'FinTech')}
              </div>
            </div>
          </div>
        </button>

        {/* Metrics Grid - Network, Risk Score, and Full-Width Accreditation */}
        <div className="space-y-3">
          {/* Top Row: Network and Risk Score */}
          <div className="grid grid-cols-2 gap-3">
            {/* Network Size */}
            <div className="p-4 bg-white rounded-lg border shadow-sm text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Users className={`h-4 w-4 ${personaColors.iconColor}`} />
                <span className="widget-text">Network</span>
              </div>
              <div className="widget-number text-2xl mb-1">{networkCount}</div>
              <div className="widget-text text-gray-500 text-sm">Companies</div>
            </div>

            {/* Risk Score */}
            <div className="p-4 bg-white rounded-lg border shadow-sm text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Shield className={`h-4 w-4 ${personaColors.iconColor}`} />
                <span className="widget-text">Risk Score</span>
              </div>
              <div className="widget-number text-2xl mb-1">{riskScore}</div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${riskStatus.color} ${riskStatus.bg} border-0 cursor-default`}>
                {riskStatus.label}
              </span>
            </div>
          </div>

          {/* Bottom Row: Full-Width Accreditation */}
          <div className="p-4 bg-white rounded-lg border shadow-sm text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <accreditationBadge.icon className={`h-4 w-4 ${personaColors.iconColor}`} />
              <span className="widget-text">Accreditation</span>
            </div>
            <div className="space-y-2">
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium border-0 cursor-default ${
                accreditationStatus === 'APPROVED' 
                  ? 'bg-green-100 text-green-800' 
                  : accreditationStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {accreditationStatus === 'APPROVED' ? 'Approved' : 
                 accreditationStatus === 'PENDING' ? 'Pending' : 'Rejected'}
              </span>
              <div className="widget-text text-gray-500 text-sm">
                {getExpirationInfo()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}