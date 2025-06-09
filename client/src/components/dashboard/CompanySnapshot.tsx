/**
 * ========================================
 * Company Snapshot Widget - Enterprise Dashboard Component
 * ========================================
 * 
 * Comprehensive company overview widget providing persona-specific business metrics,
 * risk indicators, and network relationships. Implements unified design token system
 * with smooth animations, accessibility compliance, and responsive behavior.
 * 
 * Key Features:
 * - Persona-based content filtering (Invela, Bank, FinTech)
 * - Real-time company performance metrics with unified risk calculations
 * - Interactive network relationship visualization
 * - Smooth entrance animations with staggered delays
 * - Professional loading states with shimmer effects
 * - Accessibility-compliant design with proper ARIA labels
 * 
 * Design System Integration:
 * - widget-card-metric for consistent metric display
 * - widget-grid-metrics for responsive layout
 * - widget-entrance-animation for premium feel
 * - widget-skeleton-shimmer for loading states
 * 
 * Data Sources:
 * - Company profile and business information
 * - Real-time unified risk assessment data
 * - Network relationship analysis
 * - Accreditation status verification
 * 
 * @module components/dashboard/CompanySnapshot
 * @version 3.0.0
 * @since 2025-06-09
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { 
  Building2, 
  Award,
  CheckCircle,
  Network,
  TrendingUp,
  Loader2,
  ExternalLink,
  Shield,
  Users
} from "lucide-react";
import { Widget } from "@/components/dashboard/Widget";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { getCompanySnapshotForPersona, type Persona } from "@/lib/widgetPersonaConfig";

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

  // ========================================
  // INITIALIZATION & PERSONA DETECTION
  // ========================================

  // Initialize loading state management
  useEffect(() => {
    console.log('[CompanySnapshot] Widget initializing with animation delay:', animationDelay);
    const timer = setTimeout(() => {
      setIsInitializing(false);
      console.log('[CompanySnapshot] Initialization complete');
    }, 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Determine user persona from company data with fallback
  const persona: Persona = (companyData as any)?.category || 'FinTech';
  console.log('[CompanySnapshot] User persona detected:', persona, 'from company:', (companyData as any)?.name);

  // ========================================
  // DATA FETCHING WITH ENHANCED ERROR HANDLING
  // ========================================

  // Fetch network relationships with retry logic
  const { data: relationships, isLoading: isLoadingRelationships, error: relationshipsError } = useQuery<any[]>({
    queryKey: ["/api/relationships"],
    enabled: !!companyData?.id,
    retry: 3,
    retryDelay: 1000
  });

  // Fetch accreditation information with enhanced error handling
  const { data: accreditationData, isLoading: isLoadingAccreditation, error: accreditationError } = useQuery({
    queryKey: [`/api/companies/${companyData?.id}/accreditation`],
    enabled: !!companyData?.id,
    retry: 2,
    retryDelay: 800
  });

  // ========================================
  // PERSONA-BASED METRIC CONFIGURATION
  // ========================================

  // Get persona-specific metrics from configuration system
  const personaMetrics = getCompanySnapshotForPersona(persona, {
    companyData,
    relationships,
    accreditationData,
    isLoading: isLoadingRelationships || isLoadingAccreditation
  });

  console.log('[CompanySnapshot] Loaded', personaMetrics.length, 'metrics for persona:', persona);

  // ========================================
  // NAVIGATION HANDLERS
  // ========================================

  const handleMetricClick = (metricId: string) => {
    console.log('[CompanySnapshot] Metric clicked:', metricId);
    switch (metricId) {
      case 'relationships':
        setLocation("/network");
        break;
      case 'risk-score':
        setLocation(`/network/company/${companyData?.id}?tab=risk`);
        break;
      case 'accreditation':
        setLocation(`/network/company/${companyData?.id}?tab=profile`);
        break;
      default:
        console.log('[CompanySnapshot] No navigation configured for metric:', metricId);
    }
  };

  return (
    <Widget
      title="Company Snapshot"
      icon={<Building2 className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-2"
    >
      <div className="space-y-4">
        {/* Company Banner */}
        <Card className="p-4 border rounded-lg shadow-sm">
          <div className="flex flex-col items-center">
            {companyData?.logoId ? (
              <img
                src={`/api/companies/${companyData.id}/logo`}
                alt={`${companyName} logo`}
                className="w-8 h-8 object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mb-2">
                <span className="text-sm font-medium text-white">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xl font-semibold text-black">{companyName}</span>
          </div>
        </Card>
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Relationships Card */}
          <Card 
            className={cn(
              cardClassName, 
              "cursor-pointer transition-colors hover:bg-gray-50"
            )}
            onClick={handleRelationshipsClick}
          >
            <div className="flex items-center justify-center mb-2">
              <Network className={iconClassName} />
              <span className={labelClassName}>
                RELATIONSHIPS
              </span>
            </div>
            <div className={valueClassName}>
              {isLoadingRelationships ? (
                <Skeleton className="h-10 w-14 mx-auto" />
              ) : (
                relationshipsCount
              )}
            </div>
          </Card>
          
          {/* Risk Score Changes Card */}
          <Card className={cardClassName}>
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className={iconClassName} />
              <span className={labelClassName}>
                RISK CHANGES
              </span>
            </div>
            <div className={valueClassName}>
              {riskScoreChanges}
            </div>
          </Card>
        </div>
        
        {/* Bottom Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* S&P Business Data Risk Score Card */}
          <Card className={cn(
            cardClassName,
            "border-blue-500/50 border-2"
          )}>
            <div className="flex flex-col items-center mb-1 sm:mb-2">
              <div className="flex items-center justify-center">
                <Award className={iconClassName} />
                <span className="text-xs sm:text-sm font-medium text-foreground">S&P DATA</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">ACCESS RISK SCORE</span>
            </div>
            <div className={valueClassName}>
              {riskScore}
            </div>
          </Card>
          
          {/* Accreditation Card */}
          <Card className={cn(
            cardClassName,
            "border-green-500/50 border-2"
          )}>
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <CheckCircle className={iconClassName} />
              <span className={labelClassName}>
                ACCREDITATION
              </span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-black">
              {displayStatus}
            </div>
            {accreditationData && (
              <div className="text-xs mt-1 text-center">
                {accreditationData.isPermanent ? (
                  <span className="text-gray-600">(No expiration)</span>
                ) : accreditationData.daysUntilExpiration !== null ? (
                  accreditationData.daysUntilExpiration < 0 ? (
                    <span className="text-gray-600">(Expired {Math.abs(accreditationData.daysUntilExpiration)} days ago)</span>
                  ) : accreditationData.daysUntilExpiration === 0 ? (
                    <span className="text-gray-600">(Expires today)</span>
                  ) : (
                    <span className="text-gray-600">(Expires in {accreditationData.daysUntilExpiration} days)</span>
                  )
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Widget>
  );
}