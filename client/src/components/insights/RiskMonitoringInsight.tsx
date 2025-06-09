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
import { Activity } from 'lucide-react';
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
  
  // Removed timeframe state - using fixed 7-day period

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
  // Remove conditional enabling to fix React Query timing issue
  const { data: unifiedRiskData, isLoading: isLoadingRiskData, error: riskDataError } = useUnifiedRiskData({
    includeNetwork: true,
    includeDemo: true,
    enabled: canViewInsight // Only enabled if user has permission
  });

  // Extract data from unified response
  const companyRiskData = useMemo(() => {
    if (!unifiedRiskData?.companies?.length) {
      logInsight('No unified risk data available', {
        hasData: !!unifiedRiskData,
        hasCompanies: !!unifiedRiskData?.companies,
        companiesLength: unifiedRiskData?.companies?.length || 0,
        isLoading: isLoadingRiskData
      });
      return [];
    }
    
    // Debug: Check for FastPay specifically to trace data transformation
    const fastPayData = unifiedRiskData.companies.find(c => c.name.includes('FastPay'));
    if (fastPayData) {
      console.log('[FRONTEND-DEBUG] FastPay data received from API:', {
        id: fastPayData.id,
        name: fastPayData.name,
        currentScore: fastPayData.currentScore,
        status: fastPayData.status,
        rawObject: fastPayData
      });
    }
    
    logInsight('Phase 2: Data received from unified API', {
      companiesCount: unifiedRiskData.companies.length,
      thresholds: unifiedRiskData.thresholds,
      firstFewCompanies: unifiedRiskData.companies.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name,
        currentScore: c.currentScore,
        previousScore: c.previousScore,
        trend: c.trend
      }))
    });
    
    return unifiedRiskData.companies;
  }, [unifiedRiskData, isLoadingRiskData]);

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

  // Error state
  if (riskDataError) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center text-gray-500 py-8">
          <p>Unable to load risk monitoring data</p>
          <p className="text-sm">Please check your connection and try again</p>
        </div>
      </div>
    );
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
      {/* Show table with appropriate size based on isWidget */}
      <DeterioratingRiskTable
        companies={displayCompanies}
        blockThreshold={riskThresholds?.BLOCKED || 70}
        onCompanyClick={handleCompanyClick}
        timeframe="7day"
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