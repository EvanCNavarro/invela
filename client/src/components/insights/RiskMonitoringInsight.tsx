/**
 * RiskMonitoringInsight Component
 * 
 * A container component that combines the BlockedDataRecipientsAlert
 * and DeterioratingRiskTable to provide a comprehensive view of
 * Data Recipients with deteriorating risk scores.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BlockedDataRecipientsAlert from './BlockedDataRecipientsAlert';
import DeterioratingRiskTable from './DeterioratingRiskTable';
import { type CompanyRiskData } from '@/lib/riskCalculations';
import { cn } from '@/lib/utils';
import { 
  generateRealisticRiskData, 
  calculateRiskMetrics,
  type RiskMonitoringStatus 
} from '@/lib/riskCalculations';
import { getSessionCompaniesData, type SessionCompanyData } from '@/lib/sessionDataService';

// Default risk threshold if company configuration is not available
const DEFAULT_RISK_THRESHOLD = 40;

interface RiskMonitoringInsightProps {
  className?: string;
  isWidget?: boolean;
}

/**
 * Logger for the Risk Monitoring Insight component
 */
const logInsight = (action: string, details?: any) => {
  console.log(`[RiskMonitoringInsight] ${action}`, details || '');
};



/**
 * RiskMonitoringInsight Component
 */
const RiskMonitoringInsight: React.FC<RiskMonitoringInsightProps> = ({
  className,
  isWidget = false
}) => {
  // State for filtering to only show blocked companies
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false);
  
  // State for the selected time frame (7 days or 30 days)
  const [timeframe, setTimeframe] = useState<'7day' | '30day'>('7day');

  // Get the current company data (to check if it's a Bank or Invela)
  const { data: currentCompany, isLoading: isLoadingCurrentCompany } = useQuery<any>({
    queryKey: ['/api/companies/current'],
  });

  // Get all companies data
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<any[]>({
    queryKey: ['/api/companies'],
  });

  // Get risk threshold from current company's configuration
  const riskThreshold = useMemo(() => {
    if (!currentCompany) return DEFAULT_RISK_THRESHOLD;
    
    // Try to get threshold from risk configuration
    if (currentCompany.risk_configuration?.thresholds?.high) {
      return currentCompany.risk_configuration.thresholds.high;
    }
    
    // Fallback to default
    return DEFAULT_RISK_THRESHOLD;
  }, [currentCompany]);

  // Check if current company is allowed to see this insight (Bank or Invela)
  const canViewInsight = useMemo(() => {
    if (!currentCompany) return false;
    return ['Bank', 'Invela'].includes(currentCompany.category);
  }, [currentCompany]);

  // Get authentic companies with risk data from the same endpoint used by visualization
  const { data: companiesWithRisk = [] } = useQuery<any[]>({
    queryKey: ['/api/companies-with-risk'],
    enabled: !!currentCompany,
  });

  // Convert authentic company data with session-based consistency
  const companyRiskData = useMemo(() => {
    if (!companiesWithRisk.length) return [];
    
    logInsight('Using authentic risk data with session consistency', {
      companiesCount: companiesWithRisk.length,
      threshold: riskThreshold
    });
    
    // Get session-consistent data that preserves authentic scores but adds consistent trends
    const sessionData = getSessionCompaniesData(companiesWithRisk);
    
    return sessionData.map(sessionCompany => ({
      id: sessionCompany.id,
      name: sessionCompany.name,
      currentScore: sessionCompany.currentScore,
      previousScore: sessionCompany.previousScore,
      category: sessionCompany.category
    }));
  }, [companiesWithRisk, riskThreshold]);

  // Calculate risk metrics using shared service
  const riskMetrics = useMemo(() => {
    return calculateRiskMetrics(companyRiskData, riskThreshold);
  }, [companyRiskData, riskThreshold]);

  // Filter for blocked companies (below threshold)
  const blockedCompanies = useMemo(() => {
    return companyRiskData.filter(company => company.currentScore < riskThreshold);
  }, [companyRiskData, riskThreshold]);

  // Companies to display in the table (filtered or all)
  const displayCompanies = useMemo(() => {
    return showOnlyBlocked ? blockedCompanies : companyRiskData;
  }, [showOnlyBlocked, blockedCompanies, companyRiskData]);

  // Filter state is now controlled only by table interactions

  // Add navigation hook
  const [, navigate] = useLocation();

  // Handle clicking on a company in the table
  const handleCompanyClick = (companyId: number) => {
    logInsight('Company clicked - navigating to profile', { companyId });
    
    try {
      const targetUrl = `/network/company/${companyId}?tab=risk`;
      console.log('[Navigation Debug] About to navigate to:', targetUrl);
      console.log('[Navigation Debug] Current location before navigation:', location);
      
      // Use wouter's navigate function
      navigate(targetUrl);
      
      // Additional debugging
      setTimeout(() => {
        console.log('[Navigation Debug] Location after navigate call:', location);
        console.log('[Navigation Debug] Window location after navigate:', window.location.href);
      }, 100);
      
    } catch (error) {
      console.error('[Navigation Debug] Navigation failed:', error);
      logInsight('Navigation error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId 
      });
    }
  };

  // Don't render if company can't view this insight
  if (!canViewInsight) {
    return null;
  }

  // Loading state
  if (isLoadingCurrentCompany || isLoadingCompanies) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-20 bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-64 bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header row with warning and timeframe toggle */}
      {/* Row with warning message and timeframe toggle */}
      <div className="flex justify-between items-center mb-4">
        {/* Warning message on the left */}
        <div className="flex-grow mr-4">
          {blockedCompanies.length > 0 && (
            <BlockedDataRecipientsAlert count={blockedCompanies.length} />
          )}
        </div>

        {/* Timeframe toggle on the right */}
        <div className="flex-shrink-0" style={{ zIndex: 10, position: 'relative' }}>
          <div className="flex bg-muted rounded-md p-1" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[RiskMonitoring] 7-day button clicked', { currentTimeframe: timeframe });
                setTimeframe('7day');
              }}
              onMouseDown={(e) => {
                console.log('[RiskMonitoring] 7-day button mousedown');
              }}
              className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
                timeframe === '7day' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ pointerEvents: 'auto', zIndex: 11 }}
            >
              7-Day Change
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[RiskMonitoring] 30-day button clicked', { currentTimeframe: timeframe });
                setTimeframe('30day');
              }}
              onMouseDown={(e) => {
                console.log('[RiskMonitoring] 30-day button mousedown');
              }}
              className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
                timeframe === '30day' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ pointerEvents: 'auto', zIndex: 11 }}
            >
              30-Day Change
            </button>
          </div>
        </div>
      </div>
      
      {/* Show table with appropriate size based on isWidget */}
      <DeterioratingRiskTable
        key={timeframe}
        companies={displayCompanies}
        blockThreshold={riskThreshold}
        onCompanyClick={handleCompanyClick}
        timeframe={timeframe}
        className={isWidget ? "max-h-96 overflow-auto" : ""}
      />
      
      {/* Filter indicator when showing only blocked companies */}
      {showOnlyBlocked && blockedCompanies.length > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Showing only blocked Data Recipients
          </span>
          <button 
            className="text-primary hover:underline"
            onClick={() => setShowOnlyBlocked(false)}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskMonitoringInsight;