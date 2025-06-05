/**
 * Unified Risk Calculation Service
 * 
 * Single source of truth for all risk calculations across the application.
 * Provides consistent thresholds, status calculations, and trend analysis.
 * 
 * @module server/services/riskCalculationService
 * @version 1.0.0
 * @since 2025-06-05
 */

import { db } from '@db';
import { companies, relationships } from '@db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Standard risk thresholds used across the entire application
 */
export const RISK_THRESHOLDS = {
  BLOCKED: 70,
  APPROACHING_BLOCK: 50,
  MONITORING: 30,
  STABLE: 0
} as const;

/**
 * Risk status types
 */
export type RiskStatus = 'Stable' | 'Monitoring' | 'Approaching Block' | 'Blocked';

/**
 * Trend direction types
 */
export type TrendDirection = 'improving' | 'stable' | 'deteriorating';

/**
 * Company risk data interface
 */
export interface CompanyRiskData {
  id: number;
  name: string;
  currentScore: number;
  previousScore?: number;
  status: RiskStatus;
  trend: TrendDirection;
  daysInStatus: number;
  scoreChange?: number;
  percentageChange?: number;
}

/**
 * Risk statistics summary
 */
export interface RiskStatistics {
  stable: number;
  monitoring: number;
  approaching: number;
  blocked: number;
  total: number;
}

/**
 * Logger for risk calculation operations
 */
const logRisk = (action: string, details?: any) => {
  console.log(`[RiskCalculationService] ${action}`, details || '');
};

/**
 * Calculate risk status based on current score
 * 
 * @param score - Current risk score (0-100)
 * @returns Risk status
 */
export function calculateRiskStatus(score: number): RiskStatus {
  if (score >= RISK_THRESHOLDS.BLOCKED) {
    return 'Blocked';
  } else if (score >= RISK_THRESHOLDS.APPROACHING_BLOCK) {
    return 'Approaching Block';
  } else if (score >= RISK_THRESHOLDS.MONITORING) {
    return 'Monitoring';
  } else {
    return 'Stable';
  }
}

/**
 * Calculate trend direction based on score changes
 * 
 * @param currentScore - Current risk score
 * @param previousScore - Previous risk score
 * @returns Trend direction
 */
export function calculateTrendDirection(
  currentScore: number, 
  previousScore?: number
): TrendDirection {
  if (!previousScore) return 'stable';
  
  const change = currentScore - previousScore;
  const changeThreshold = 3; // Minimum change to be considered a trend
  
  if (change > changeThreshold) {
    return 'deteriorating'; // Higher score = worse risk
  } else if (change < -changeThreshold) {
    return 'improving'; // Lower score = better risk
  } else {
    return 'stable';
  }
}

/**
 * Calculate days in current status (simplified implementation)
 * 
 * @param updatedAt - Last update timestamp
 * @returns Days in current status
 */
export function calculateDaysInStatus(updatedAt: Date): number {
  const now = new Date();
  const timeDiff = now.getTime() - updatedAt.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Get risk data for a single company
 * 
 * @param companyId - Company ID
 * @returns Company risk data or null if not found
 */
export async function getCompanyRiskData(companyId: number): Promise<CompanyRiskData | null> {
  try {
    logRisk('Fetching risk data for company', { companyId });
    
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        id: true,
        name: true,
        risk_score: true,
        previous_risk_score: true,
        updated_at: true
      }
    });

    if (!company) {
      logRisk('Company not found', { companyId });
      return null;
    }

    const currentScore = company.risk_score || 0;
    const previousScore = company.previous_risk_score || undefined;
    const status = calculateRiskStatus(currentScore);
    const trend = calculateTrendDirection(currentScore, previousScore);
    const daysInStatus = calculateDaysInStatus(new Date(company.updated_at));
    
    const scoreChange = previousScore ? currentScore - previousScore : undefined;
    const percentageChange = previousScore && previousScore > 0 
      ? Math.round(((currentScore - previousScore) / previousScore) * 100 * 100) / 100
      : undefined;

    const riskData: CompanyRiskData = {
      id: company.id,
      name: company.name,
      currentScore,
      previousScore,
      status,
      trend,
      daysInStatus,
      scoreChange,
      percentageChange
    };

    logRisk('Risk data calculated', { companyId, status, trend, currentScore });
    return riskData;

  } catch (error) {
    logRisk('Error fetching company risk data', { 
      companyId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return null;
  }
}

/**
 * Get risk data for multiple companies
 * 
 * @param companyIds - Array of company IDs
 * @returns Array of company risk data
 */
export async function getMultipleCompaniesRiskData(companyIds: number[]): Promise<CompanyRiskData[]> {
  try {
    logRisk('Fetching risk data for multiple companies', { count: companyIds.length });
    
    const companiesData = await db.query.companies.findMany({
      where: inArray(companies.id, companyIds),
      columns: {
        id: true,
        name: true,
        risk_score: true,
        previous_risk_score: true,
        updated_at: true
      }
    });

    const riskDataArray: CompanyRiskData[] = companiesData.map((company: any) => {
      const currentScore = company.risk_score || 0;
      const previousScore = company.previous_risk_score || undefined;
      const status = calculateRiskStatus(currentScore);
      const trend = calculateTrendDirection(currentScore, previousScore);
      const daysInStatus = calculateDaysInStatus(new Date(company.updated_at));
      
      const scoreChange = previousScore ? currentScore - previousScore : undefined;
      const percentageChange = previousScore && previousScore > 0 
        ? Math.round(((currentScore - previousScore) / previousScore) * 100 * 100) / 100
        : undefined;

      return {
        id: company.id,
        name: company.name,
        currentScore,
        previousScore,
        status,
        trend,
        daysInStatus,
        scoreChange,
        percentageChange
      };
    });

    logRisk('Risk data calculated for multiple companies', { 
      count: riskDataArray.length,
      statistics: calculateRiskStatistics(riskDataArray)
    });

    return riskDataArray;

  } catch (error) {
    logRisk('Error fetching multiple companies risk data', { 
      companyIds, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Calculate risk statistics from company risk data
 * 
 * @param riskData - Array of company risk data
 * @returns Risk statistics summary
 */
export function calculateRiskStatistics(riskData: CompanyRiskData[]): RiskStatistics {
  const stats: RiskStatistics = {
    stable: 0,
    monitoring: 0,
    approaching: 0,
    blocked: 0,
    total: riskData.length
  };

  riskData.forEach(company => {
    switch (company.status) {
      case 'Stable':
        stats.stable++;
        break;
      case 'Monitoring':
        stats.monitoring++;
        break;
      case 'Approaching Block':
        stats.approaching++;
        break;
      case 'Blocked':
        stats.blocked++;
        break;
    }
  });

  return stats;
}

/**
 * Get network risk statistics for a company
 * 
 * @param userCompanyId - User's company ID
 * @returns Risk statistics for their network
 */
export async function getNetworkRiskStatistics(userCompanyId: number): Promise<RiskStatistics> {
  try {
    logRisk('Calculating network risk statistics', { userCompanyId });
    
    // Get network relationship company IDs using imported relationships schema
    
    const networkRelationships = await db.query.relationships.findMany({
      where: eq(relationships.company_id, userCompanyId),
      columns: { related_company_id: true }
    });
    
    const relatedCompanyIds = networkRelationships.map(r => r.related_company_id);
    
    if (relatedCompanyIds.length === 0) {
      logRisk('No network relationships found', { userCompanyId });
      return {
        stable: 0,
        monitoring: 0,
        approaching: 0,
        blocked: 0,
        total: 0
      };
    }

    const networkRiskData = await getMultipleCompaniesRiskData(relatedCompanyIds);
    const statistics = calculateRiskStatistics(networkRiskData);
    
    logRisk('Network risk statistics calculated', { userCompanyId, statistics });
    return statistics;

  } catch (error) {
    logRisk('Error calculating network risk statistics', { 
      userCompanyId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return {
      stable: 0,
      monitoring: 0,
      approaching: 0,
      blocked: 0,
      total: 0
    };
  }
}