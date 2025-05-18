/**
 * RiskMonitoringInsight Component
 * 
 * A container component that combines the BlockedDataRecipientsAlert
 * and DeterioratingRiskTable to provide a comprehensive view of
 * Data Recipients with deteriorating risk scores.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import BlockedDataRecipientsAlert from './BlockedDataRecipientsAlert';
import DeterioratingRiskTable, { CompanyRiskData } from './DeterioratingRiskTable';
import { cn } from '@/lib/utils';

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
 * Generate synthetic historical data for development/demo purposes
 * In a production environment, this would use actual historical data
 */
const generateHistoricalData = (companies: any[], riskThreshold: number): CompanyRiskData[] => {
  // Filter to only include companies that are data recipients (fintech)
  const dataRecipients = companies.filter(company => 
    company.category === 'FinTech'
  );
  
  logInsight('Generating historical data', { 
    dataRecipientsCount: dataRecipients.length,
    threshold: riskThreshold
  });

  // Generate risk data with different patterns
  return dataRecipients.map((company, index) => {
    // Current score from company data or default to a random value
    const currentScore = company.risk_score || 
      Math.max(20, Math.min(95, Math.floor(Math.random() * 100)));
    
    // Create different patterns of risk change
    let previousScore;
    
    // Every third company is improving (but might still be below threshold)
    if (index % 3 === 0) {
      previousScore = Math.max(20, currentScore - (Math.random() * 15 + 2));
    } 
    // Every third company has deteriorated but is still above threshold
    else if (index % 3 === 1) {
      previousScore = Math.min(99, currentScore + (Math.random() * 15 + 5));
    } 
    // Every third company has deteriorated and is now below threshold
    else {
      const belowThreshold = currentScore < riskThreshold;
      if (belowThreshold) {
        // Already below threshold - was above before
        previousScore = riskThreshold + (Math.random() * 10 + 3);
      } else {
        // Still above threshold - show deterioration
        previousScore = currentScore + (Math.random() * 8 + 2);
      }
    }
    
    return {
      id: company.id,
      name: company.name,
      currentScore: Math.round(currentScore),
      previousScore: Math.round(previousScore),
      category: company.category
    };
  });
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

  // Generate company risk data
  const companyRiskData = useMemo(() => {
    if (!companies.length) return [];
    return generateHistoricalData(companies, riskThreshold);
  }, [companies, riskThreshold]);

  // Filter for blocked companies (below threshold)
  const blockedCompanies = useMemo(() => {
    return companyRiskData.filter(company => company.currentScore < riskThreshold);
  }, [companyRiskData, riskThreshold]);

  // Companies to display in the table (filtered or all)
  const displayCompanies = useMemo(() => {
    return showOnlyBlocked ? blockedCompanies : companyRiskData;
  }, [showOnlyBlocked, blockedCompanies, companyRiskData]);

  // Handle the blocked alert click to toggle filtering
  const handleBlockedAlertClick = () => {
    logInsight('Blocked alert clicked, toggling filter', { 
      currentFilter: showOnlyBlocked 
    });
    setShowOnlyBlocked(!showOnlyBlocked);
  };

  // Handle clicking on a company in the table
  const handleCompanyClick = (companyId: number) => {
    logInsight('Company clicked', { companyId });
    // In a real implementation, this could navigate to company details
    // or show a modal with more information
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
      {/* Show alert only if there are blocked companies */}
      {blockedCompanies.length > 0 && (
        <BlockedDataRecipientsAlert
          count={blockedCompanies.length}
          onClick={handleBlockedAlertClick}
        />
      )}
      
      {/* Show table with appropriate size based on isWidget */}
      <DeterioratingRiskTable
        companies={displayCompanies}
        blockThreshold={riskThreshold}
        onCompanyClick={handleCompanyClick}
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