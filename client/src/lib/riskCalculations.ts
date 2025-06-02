/**
 * ========================================
 * Risk Calculation Service
 * ========================================
 * 
 * Centralized service for calculating risk monitoring status across
 * the enterprise risk assessment platform. Provides consistent
 * risk status determination, blocking logic, and threshold management
 * used throughout the application.
 * 
 * Key Features:
 * - Consistent risk status calculation across all components
 * - 15% blocking cap implementation for realistic data
 * - Centralized threshold management
 * - Comprehensive error handling and logging
 * - TypeScript type safety
 * 
 * @module lib/riskCalculations
 * @version 1.0.0
 * @since 2025-06-02
 */

/**
 * Risk monitoring status types
 */
export type RiskMonitoringStatus = 'Stable' | 'Monitoring' | 'Approaching Block' | 'Blocked';

/**
 * Company data interface for risk calculations
 */
export interface CompanyRiskData {
  id: number;
  name: string;
  currentScore: number;
  previousScore: number;
  category: string;
}

/**
 * Risk calculation configuration
 */
export interface RiskCalculationConfig {
  threshold: number;
  blockingCapPercentage: number;
  deteriorationThreshold: number;
  approachingBlockPercentage: number;
}

/**
 * Default risk calculation configuration
 */
const DEFAULT_CONFIG: RiskCalculationConfig = {
  threshold: 40,
  blockingCapPercentage: 0.15, // 15% cap
  deteriorationThreshold: 5, // Minimum score drop to be considered deteriorating
  approachingBlockPercentage: 20 // Within 20% of threshold
};

/**
 * Logger for risk calculation operations
 */
const logRiskCalculation = (action: string, details?: any) => {
  console.log(`[RiskCalculations] ${action}`, details || '');
};

/**
 * Calculate the risk monitoring status for a single company
 * 
 * @param currentScore - Current risk score (0-100)
 * @param previousScore - Previous risk score for trend analysis
 * @param threshold - Risk threshold for blocking (default: 40)
 * @returns Risk monitoring status
 */
export const calculateRiskStatus = (
  currentScore: number, 
  previousScore: number, 
  threshold: number = DEFAULT_CONFIG.threshold
): RiskMonitoringStatus => {
  try {
    logRiskCalculation('Calculating risk status', { 
      currentScore, 
      previousScore, 
      threshold 
    });

    // Validate input parameters
    if (currentScore < 0 || currentScore > 100) {
      logRiskCalculation('Invalid current score', { currentScore });
      return 'Stable';
    }

    if (previousScore < 0 || previousScore > 100) {
      logRiskCalculation('Invalid previous score', { previousScore });
      return 'Stable';
    }

    // If below threshold, the company is blocked
    if (currentScore < threshold) {
      logRiskCalculation('Company is blocked', { currentScore, threshold });
      return 'Blocked';
    }
    
    // Calculate percentage distance to threshold
    const percentToThreshold = ((currentScore - threshold) / (100 - threshold)) * 100;
    
    // Determine if company has significantly deteriorated
    const scoreChange = previousScore - currentScore;
    const hasDeteriorated = scoreChange > DEFAULT_CONFIG.deteriorationThreshold;
    
    logRiskCalculation('Risk status calculation details', {
      percentToThreshold,
      scoreChange,
      hasDeteriorated,
      approachingThreshold: percentToThreshold < DEFAULT_CONFIG.approachingBlockPercentage
    });
    
    // Company is approaching block if close to threshold and deteriorating
    if (percentToThreshold < DEFAULT_CONFIG.approachingBlockPercentage && hasDeteriorated) {
      return 'Approaching Block';
    } 
    
    // Company is being monitored if it has deteriorated significantly
    if (hasDeteriorated) {
      return 'Monitoring';
    }
    
    // Default to stable
    return 'Stable';
    
  } catch (error) {
    logRiskCalculation('Error calculating risk status', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      currentScore,
      previousScore,
      threshold
    });
    return 'Stable';
  }
};

/**
 * Apply 15% blocking cap to ensure realistic data representation
 * Selects the lowest-scoring companies up to the cap limit
 * 
 * @param companies - Array of company risk data
 * @param threshold - Risk threshold for blocking
 * @param config - Risk calculation configuration
 * @returns Updated company data with realistic blocking distribution
 */
export const applyBlockingCap = (
  companies: CompanyRiskData[],
  threshold: number = DEFAULT_CONFIG.threshold,
  config: RiskCalculationConfig = DEFAULT_CONFIG
): CompanyRiskData[] => {
  try {
    logRiskCalculation('Applying blocking cap', {
      totalCompanies: companies.length,
      threshold,
      capPercentage: config.blockingCapPercentage
    });

    // Filter to only FinTech companies (Data Recipients)
    const finTechCompanies = companies.filter(company => 
      company.category === 'FinTech'
    );

    if (finTechCompanies.length === 0) {
      logRiskCalculation('No FinTech companies found', { totalCompanies: companies.length });
      return companies;
    }

    // Calculate maximum number of companies that can be blocked (15% cap)
    const maxBlockedCompanies = Math.floor(finTechCompanies.length * config.blockingCapPercentage);
    
    logRiskCalculation('Blocking cap calculation', {
      finTechCount: finTechCompanies.length,
      maxBlocked: maxBlockedCompanies,
      capPercentage: config.blockingCapPercentage
    });

    // If cap is 0 (for small networks), no companies should be blocked
    if (maxBlockedCompanies === 0) {
      logRiskCalculation('Network too small for blocking', { finTechCount: finTechCompanies.length });
      // Ensure all companies have scores above threshold
      return companies.map(company => ({
        ...company,
        currentScore: Math.max(company.currentScore, threshold + 5)
      }));
    }

    // Sort FinTech companies by current score (lowest first)
    const sortedFinTech = [...finTechCompanies].sort((a, b) => a.currentScore - b.currentScore);
    
    // Companies to be blocked (lowest scores up to cap)
    const blockedCompanyIds = new Set(
      sortedFinTech.slice(0, maxBlockedCompanies).map(company => company.id)
    );

    // Update company scores to respect the blocking cap
    const updatedCompanies = companies.map(company => {
      if (company.category !== 'FinTech') {
        return company; // Non-FinTech companies remain unchanged
      }

      // If company should be blocked according to cap
      if (blockedCompanyIds.has(company.id)) {
        return {
          ...company,
          currentScore: Math.min(company.currentScore, threshold - 1)
        };
      } 
      
      // If company should not be blocked, ensure score is above threshold
      return {
        ...company,
        currentScore: Math.max(company.currentScore, threshold + 1)
      };
    });

    const actualBlockedCount = updatedCompanies.filter(c => 
      c.category === 'FinTech' && c.currentScore < threshold
    ).length;

    logRiskCalculation('Blocking cap applied successfully', {
      targetBlocked: maxBlockedCompanies,
      actualBlocked: actualBlockedCount,
      totalFinTech: finTechCompanies.length
    });

    return updatedCompanies;

  } catch (error) {
    logRiskCalculation('Error applying blocking cap', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      companiesCount: companies.length,
      threshold
    });
    return companies; // Return original data on error
  }
};

/**
 * Generate company risk data with realistic patterns and blocking cap
 * 
 * @param companies - Array of company data
 * @param threshold - Risk threshold for blocking
 * @returns Array of company risk data with calculated scores and status
 */
export const generateRealisticRiskData = (
  companies: any[],
  threshold: number = DEFAULT_CONFIG.threshold
): CompanyRiskData[] => {
  try {
    logRiskCalculation('Generating realistic risk data', {
      companiesCount: companies.length,
      threshold
    });

    // Filter to only include FinTech companies (Data Recipients)
    const finTechCompanies = companies.filter(company => 
      company.category === 'FinTech'
    );

    if (finTechCompanies.length === 0) {
      logRiskCalculation('No FinTech companies to process');
      return [];
    }

    // Generate risk data for each company
    const companiesWithRisk = finTechCompanies.map((company, index) => {
      // Use existing risk score or generate realistic score
      const currentScore = company.risk_score || company.riskScore || 
        Math.max(20, Math.min(95, Math.floor(Math.random() * 100)));
      
      // Create varied risk patterns
      let previousScore;
      
      // Pattern distribution for realistic data
      const patternType = index % 4;
      
      switch (patternType) {
        case 0: // Improving companies (25%)
          previousScore = Math.max(20, currentScore - (Math.random() * 12 + 3));
          break;
        case 1: // Stable companies (25%)
          previousScore = currentScore + (Math.random() * 6 - 3); // ±3 points
          break;
        case 2: // Moderate deterioration (25%)
          previousScore = Math.min(99, currentScore + (Math.random() * 10 + 3));
          break;
        case 3: // Significant deterioration (25%)
          previousScore = Math.min(99, currentScore + (Math.random() * 15 + 8));
          break;
        default:
          previousScore = currentScore;
      }

      return {
        id: company.id,
        name: company.name,
        currentScore: Math.round(currentScore),
        previousScore: Math.round(previousScore),
        category: company.category
      };
    });

    // Apply 15% blocking cap to ensure realistic distribution
    const cappedData = applyBlockingCap(companiesWithRisk, threshold);

    logRiskCalculation('Risk data generation complete', {
      processedCompanies: cappedData.length,
      blockedCount: cappedData.filter(c => c.currentScore < threshold).length
    });

    return cappedData;

  } catch (error) {
    logRiskCalculation('Error generating risk data', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      companiesCount: companies.length
    });
    return [];
  }
};

/**
 * Get color class for risk monitoring status badge
 * 
 * @param status - Risk monitoring status
 * @returns Tailwind CSS classes for status styling
 */
export const getRiskStatusColor = (status: RiskMonitoringStatus): string => {
  switch (status) {
    case 'Blocked':
      return 'bg-red-25 text-red-600 border border-red-100/50';
    case 'Approaching Block':
      return 'bg-amber-25 text-amber-600 border border-amber-100/50';
    case 'Monitoring':
      return 'bg-blue-25 text-blue-600 border border-blue-100/50';
    case 'Stable':
    default:
      return 'bg-gray-25 text-gray-600 border border-gray-100/50';
  }
};

/**
 * Calculate risk monitoring metrics for dashboard summary
 * 
 * @param companies - Array of company risk data
 * @param threshold - Risk threshold for blocking
 * @returns Risk monitoring metrics
 */
export const calculateRiskMetrics = (
  companies: CompanyRiskData[],
  threshold: number = DEFAULT_CONFIG.threshold
) => {
  try {
    const metrics = companies.reduce((acc, company) => {
      const status = calculateRiskStatus(company.currentScore, company.previousScore, threshold);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<RiskMonitoringStatus, number>);

    const totalCompanies = companies.length;
    const blockedCount = metrics.Blocked || 0;
    const blockedPercentage = totalCompanies > 0 ? (blockedCount / totalCompanies) * 100 : 0;

    logRiskCalculation('Risk metrics calculated', {
      totalCompanies,
      blocked: blockedCount,
      blockedPercentage: blockedPercentage.toFixed(1) + '%',
      metrics
    });

    return {
      total: totalCompanies,
      blocked: blockedCount,
      approaching: metrics['Approaching Block'] || 0,
      monitoring: metrics.Monitoring || 0,
      stable: metrics.Stable || 0,
      blockedPercentage: Math.round(blockedPercentage * 10) / 10
    };

  } catch (error) {
    logRiskCalculation('Error calculating metrics', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return {
      total: 0,
      blocked: 0,
      approaching: 0,
      monitoring: 0,
      stable: 0,
      blockedPercentage: 0
    };
  }
};