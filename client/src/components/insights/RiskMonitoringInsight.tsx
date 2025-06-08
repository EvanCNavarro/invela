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
import { cn } from '@/lib/utils';
import { useUnifiedRiskData, type UnifiedRiskData } from '@/lib/useUnifiedRiskData';

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
  
  // Debug logging for timeframe changes
  useEffect(() => {
    console.log('[RiskMonitoring] Timeframe state changed to:', timeframe);
  }, [timeframe]);

  // Get the current company data (to check if it's a Bank or Invela)
  const { data: currentCompany, isLoading: isLoadingCurrentCompany } = useQuery<any>({
    queryKey: ['/api/companies/current'],
  });

  // Check if current company is allowed to see this insight (Bank or Invela)
  const canViewInsight = useMemo(() => {
    if (!currentCompany) return false;
    return ['Bank', 'Invela'].includes(currentCompany.category);
  }, [currentCompany]);

  // Get unified risk data using the new unified hook
  const { data: unifiedRiskData, isLoading: isLoadingRiskData } = useUnifiedRiskData({
    includeNetwork: true,
    includeDemo: true,
    enabled: canViewInsight
  });

  // Extract data from unified response
  const companyRiskData = useMemo(() => {
    if (!unifiedRiskData?.companies?.length) return [];
    
    logInsight('Using unified risk data for consistency', {
      companiesCount: unifiedRiskData.companies.length,
      thresholds: unifiedRiskData.thresholds
    });
    
    return unifiedRiskData.companies;
  }, [unifiedRiskData]);

  // Get risk thresholds from unified service
  const riskThresholds = unifiedRiskData?.thresholds;
  const riskMetrics = unifiedRiskData?.metrics;

  // Filter for blocked companies (using unified threshold logic)
  const blockedCompanies = useMemo(() => {
    if (!riskThresholds) return [];
    return companyRiskData.filter(company => company.status === 'Blocked');
  }, [companyRiskData, riskThresholds]);

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
  if (isLoadingCurrentCompany || isLoadingRiskData) {
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
        {/* Status message on the left - always show */}
        <div className="flex-grow mr-4">
          <BlockedDataRecipientsAlert count={blockedCompanies.length} />
        </div>

        {/* Timeframe toggle on the right */}
        <div className="flex-shrink-0">
          <div className="flex bg-muted rounded-md p-1">
            <button
              onClick={() => {
                console.log('[RiskMonitoring] 7-day button clicked');
                setTimeframe('7day');
              }}
              className={`px-3 py-1 text-sm font-medium rounded-sm ${
                timeframe === '7day' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7-Day Change
            </button>
            <button
              onClick={() => {
                console.log('[RiskMonitoring] 30-day button clicked');
                setTimeframe('30day');
              }}
              className={`px-3 py-1 text-sm font-medium rounded-sm ${
                timeframe === '30day' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30-Day Change
            </button>
          </div>
        </div>
      </div>
      
      {/* Show table with appropriate size based on isWidget */}
      <DeterioratingRiskTable
        companies={displayCompanies}
        blockThreshold={riskThresholds?.BLOCKED || 70}
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