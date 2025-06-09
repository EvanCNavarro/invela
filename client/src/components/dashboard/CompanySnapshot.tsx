/**
 * ========================================
 * Company Snapshot Widget - Compact Overview
 * ========================================
 * 
 * Clean, compact company overview showing essential information
 * for the currently logged-in company in a single column layout.
 */

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Shield,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Gauge
} from "lucide-react";
import { Widget } from "@/components/dashboard/Widget";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface CompanySnapshotProps {
  companyData: any;
  onToggle: () => void;
  isVisible: boolean;
  /** Animation delay for staggered entrance effects */
  animationDelay?: number;
}

export function CompanySnapshot({ 
  companyData, 
  onToggle, 
  isVisible,
  animationDelay = 0
}: CompanySnapshotProps) {
  const [, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize animation state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);
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

  // Show enhanced loading skeleton during data fetch
  if (isLoadingRelationships || isInitializing) {
    return (
      <Widget
        title="Company Snapshot"
        icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        size="standard"
        loadingState="shimmer"
        isLoading={true}
        animationDelay={animationDelay}
        ariaLabel="Company overview widget loading"
      >
        <div className="space-y-4">
          {/* Company Header Skeleton */}
          <div 
            className="widget-skeleton-shimmer h-16 rounded-lg"
            style={{ animationDelay: `${animationDelay}ms` }}
          />
          
          {/* Metrics Grid Skeleton */}
          <div className="space-y-3">
            {/* Network and Risk Score Row */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="widget-skeleton-shimmer h-20 rounded-lg"
                style={{ animationDelay: `${animationDelay + 100}ms` }}
              />
              <div 
                className="widget-skeleton-shimmer h-20 rounded-lg"
                style={{ animationDelay: `${animationDelay + 200}ms` }}
              />
            </div>
            
            {/* Accreditation Full Width Skeleton */}
            <div 
              className="widget-skeleton-shimmer h-16 rounded-lg"
              style={{ animationDelay: `${animationDelay + 300}ms` }}
            />
          </div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget
      title="Company Snapshot"
      icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      size="standard"
      entranceAnimation="fadeIn"
      animationDelay={animationDelay}
      ariaLabel="Company overview widget"
    >
      <div className="space-y-4">
        {/* Compact Company Header - Clickable */}
        <button 
          onClick={() => setLocation(`/network/company/${companyData?.id || 1}`)}
          className={cn(
            "w-full p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 hover:border-blue-200 transition-all duration-200 group",
            "widget-entrance-animation"
          )}
          style={{ animationDelay: `${animationDelay}ms` }}
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
              <h3 className="widget-title truncate">
                {companyData?.name || 'Company Name'}
              </h3>
              <div className="widget-text text-gray-600 text-sm">
                {getCompanyRole(companyData?.category || 'FinTech')}
              </div>
            </div>
            
            {/* Right-aligned arrow */}
            <div className="flex-shrink-0">
              <ArrowRight className="h-4 w-4 text-blue-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </button>

        {/* Metrics Grid - Network, Risk Score, and Full-Width Accreditation */}
        <div 
          className={cn("space-y-3", "widget-entrance-animation")}
          style={{ animationDelay: `${animationDelay + 100}ms` }}
        >
          {/* Top Row: Network and Risk Score */}
          <div className="widget-grid-compact">
            {/* Network Size */}
            <div className="widget-card-metric text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Users className={`widget-icon-standard ${personaColors.iconColor}`} />
                <span className="widget-text">Network</span>
              </div>
              <div className="widget-number text-2xl mb-1">{networkCount}</div>
              <div className="widget-text text-gray-500 text-sm">Companies</div>
            </div>

            {/* Risk Score */}
            <div className="widget-card-metric text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <AlertTriangle className={`widget-icon-standard ${personaColors.iconColor}`} />
                <span className="widget-text">Risk Score</span>
              </div>
              <div className="widget-number text-2xl mb-1">{riskScore}</div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${riskStatus.color} ${riskStatus.bg} border-0 cursor-default`}>
                {riskStatus.label}
              </span>
            </div>
          </div>

          {/* Third Row: Full-Width Accreditation */}
          <div className="widget-card-metric text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <accreditationBadge.icon className={`widget-icon-standard ${personaColors.iconColor}`} />
              <span className="widget-text">Accreditation</span>
            </div>
            <div className="space-y-2">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border-0 cursor-default ${
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

          {/* Bottom Row: Alert Cards */}
          <div className="widget-grid-compact">
            {/* Active Alerts */}
            <div className="widget-card-metric text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <AlertTriangle className="widget-icon-standard text-amber-600" />
                <span className="widget-text">Active Alerts</span>
              </div>
              <div className="widget-number text-xl">0</div>
            </div>

            {/* New Alerts */}
            <div className="widget-card-metric text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Clock className="widget-icon-standard text-blue-600" />
                <span className="widget-text">New Alerts</span>
              </div>
              <div className="widget-number text-xl">0</div>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}