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
  TrendingUp,
  Loader2,
  ExternalLink
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
    relationships: relationships || [],
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

  // ========================================
  // LOADING & ERROR STATE HANDLING
  // ========================================

  // Show enhanced loading skeleton during data fetch
  if (isLoadingRelationships || isLoadingAccreditation || isInitializing) {
    console.log('[CompanySnapshot] Rendering loading state');
    return (
      <Widget
        title="Company Snapshot"
        icon={<Building2 className="h-5 w-5 text-gray-700" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        size="standard"
        loadingState="shimmer"
        isLoading={true}
        animationDelay={animationDelay}
        ariaLabel="Company snapshot widget loading"
      >
        <div className="space-y-4">
          <div className="widget-skeleton-shimmer h-20 rounded-lg" 
               style={{ animationDelay: `${animationDelay}ms` }} />
          <div className="widget-grid-metrics">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="widget-skeleton-shimmer h-24 rounded-lg"
                style={{ animationDelay: `${animationDelay + (index * 100)}ms` }}
              />
            ))}
          </div>
        </div>
      </Widget>
    );
  }

  // Show error state with retry option
  if (relationshipsError || accreditationError) {
    console.error('[CompanySnapshot] Error loading data:', { relationshipsError, accreditationError });
    return (
      <Widget
        title="Company Snapshot"
        icon={<Building2 className="h-5 w-5 text-gray-700" />}
        onVisibilityToggle={onToggle}
        isVisible={isVisible}
        size="standard"
        error="Unable to load company data. Please refresh to try again."
        animationDelay={animationDelay}
      >
        <div />
      </Widget>
    );
  }

  // ========================================
  // MAIN RENDER - ENTERPRISE WIDGET
  // ========================================

  const companyName = companyData?.name || "Loading...";
  console.log('[CompanySnapshot] Rendering main widget with', personaMetrics.length, 'metrics for', persona);

  return (
    <Widget
      title="Company Snapshot"
      icon={<Building2 className="h-5 w-5 text-gray-700" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      size="standard"
      entranceAnimation="fadeIn"
      animationDelay={animationDelay}
      ariaLabel={`Company snapshot for ${companyName}`}
      className="h-full"
    >
      <div className="space-y-6">
        {/* Company Banner with Enhanced Styling */}
        <div 
          className={cn(
            "widget-card-header p-4 rounded-lg group",
            "widget-entrance-animation"
          )}
          style={{ animationDelay: `${animationDelay}ms` }}
        >
          <div className="flex flex-col items-center widget-gap-standard">
            {companyData?.logoId ? (
              <img
                src={`/api/companies/${companyData.id}/logo`}
                alt={`${companyName} logo`}
                className="w-12 h-12 object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <span className="text-lg font-bold text-white">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="text-center">
              <h3 className="widget-title">{companyName}</h3>
              <p className="widget-text mt-1">
                {persona} Account • {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Persona-Based Metrics Grid */}
        <div className="widget-grid-metrics">
          {personaMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            const statusColors = {
              success: 'text-green-600 border-green-200 bg-green-50',
              warning: 'text-yellow-600 border-yellow-200 bg-yellow-50',
              error: 'text-red-600 border-red-200 bg-red-50',
              neutral: 'text-muted-foreground border-border bg-card'
            };
            
            return (
              <button
                key={metric.id}
                className={cn(
                  "widget-card-metric p-4 rounded-lg group text-left",
                  "widget-entrance-animation",
                  statusColors[metric.status || 'neutral'],
                  metric.clickable && "cursor-pointer hover:shadow-md widget-interaction-smooth",
                  !metric.clickable && "cursor-default"
                )}
                style={{ 
                  animationDelay: `${animationDelay + ((index + 1) * 150)}ms` 
                }}
                onClick={() => metric.clickable && handleMetricClick(metric.id)}
                disabled={!metric.clickable}
                aria-label={metric.description || metric.label}
                title={metric.description}
              >
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="h-4 w-4 text-gray-700" />
                  {metric.clickable && (
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="widget-text">
                    {metric.label}
                  </p>
                  <p className="widget-data">
                    {metric.value}
                  </p>
                  {metric.trend && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className={cn(
                        "h-3 w-3",
                        metric.trend === 'up' ? 'text-green-500' : 
                        metric.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                      )} />
                      <span className="widget-text">
                        {metric.trend === 'up' ? 'Trending up' : 
                         metric.trend === 'down' ? 'Trending down' : 'Stable'}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {personaMetrics.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Building2 className="widget-icon-large text-muted-foreground mx-auto mb-2" />
              <p className="text-widget-caption">No metrics available for {persona} users</p>
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}