/**
 * Unified Risk Calculation Service
 * 
 * Single source of truth for all risk calculations across the application.
 * Replaces multiple independent calculation engines with consistent logic.
 * 
 * Features:
 * - Unified threshold management (70/50/30 system-wide)
 * - Consistent risk status determination
 * - Coordinated database field updates
 * - Centralized caching strategy
 * - Historical trend calculations
 */

import { db } from "@db";
import { companies } from "@db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export type RiskStatus = 'Blocked' | 'Approaching Block' | 'Monitoring' | 'Stable';
export type RiskTrend = 'improving' | 'stable' | 'deteriorating';

export interface UnifiedRiskData {
  id: number;
  name: string;
  currentScore: number;
  previousScore: number;
  status: RiskStatus;
  trend: RiskTrend;
  daysInStatus: number;
  category: string;
  isDemo: boolean;
  updatedAt: Date;
}

export interface RiskMetricsSummary {
  total: number;
  blocked: number;
  approaching: number;
  monitoring: number;
  stable: number;
  blockedPercentage: number;
}

/**
 * Unified Risk Calculation Service
 * All risk calculations must use this service for consistency
 */
export class UnifiedRiskCalculationService {
  
  /**
   * System-wide risk thresholds - single source of truth
   * These values are used consistently across all components
   */
  private static readonly RISK_THRESHOLDS = {
    BLOCKED: 70,
    APPROACHING_BLOCK: 50,
    MONITORING: 30,
    STABLE: 0
  } as const;

  /**
   * Cache duration for risk calculations (2 minutes)
   */
  private static readonly CACHE_DURATION_MS = 2 * 60 * 1000;
  
  /**
   * In-memory cache for risk data
   */
  private static riskDataCache: Map<string, { data: any; timestamp: number }> = new Map();

  /**
   * Get unified risk thresholds
   * Used by frontend components for consistent threshold display
   */
  static getThresholds() {
    return { ...this.RISK_THRESHOLDS };
  }

  /**
   * Calculate risk status from score using unified thresholds
   * @param score - Risk score (0-100)
   * @returns Risk status
   */
  static calculateRiskStatus(score: number): RiskStatus {
    if (score >= this.RISK_THRESHOLDS.BLOCKED) {
      return 'Blocked';
    } else if (score >= this.RISK_THRESHOLDS.APPROACHING_BLOCK) {
      return 'Approaching Block';
    } else if (score >= this.RISK_THRESHOLDS.MONITORING) {
      return 'Monitoring';
    } else {
      return 'Stable';
    }
  }

  /**
   * Calculate risk trend from current and previous scores
   * @param currentScore - Current risk score
   * @param previousScore - Previous risk score
   * @returns Risk trend
   */
  static calculateRiskTrend(currentScore: number, previousScore: number): RiskTrend {
    const scoreDifference = currentScore - previousScore;
    const significantChangeThreshold = 5; // 5 point change is significant

    if (Math.abs(scoreDifference) < significantChangeThreshold) {
      return 'stable';
    }

    return scoreDifference > 0 ? 'improving' : 'deteriorating';
  }

  /**
   * Calculate days in current status
   * @param updatedAt - Last update timestamp
   * @returns Days in current status
   */
  static calculateDaysInStatus(updatedAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get risk data for a single company
   * @param companyId - Company ID
   * @returns Unified risk data
   */
  static async getCompanyRiskData(companyId: number): Promise<UnifiedRiskData | null> {
    try {
      const cacheKey = `company_${companyId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: {
          id: true,
          name: true,
          risk_score: true,
          previous_risk_score: true,
          category: true,
          is_demo: true,
          updated_at: true
        }
      });

      if (!company) {
        return null;
      }

      const currentScore = company.risk_score || 0;
      const previousScore = company.previous_risk_score || 0;
      const status = this.calculateRiskStatus(currentScore);
      const trend = this.calculateRiskTrend(currentScore, previousScore);
      const daysInStatus = this.calculateDaysInStatus(new Date(company.updated_at));

      const riskData: UnifiedRiskData = {
        id: company.id,
        name: company.name,
        currentScore,
        previousScore,
        status,
        trend,
        daysInStatus,
        category: company.category || 'FinTech',
        isDemo: company.is_demo || false,
        updatedAt: new Date(company.updated_at)
      };

      this.setCachedData(cacheKey, riskData);
      return riskData;

    } catch (error) {
      console.error('[UnifiedRiskCalculationService] Error getting company risk data:', error);
      return null;
    }
  }

  /**
   * Get risk data for all companies in the network
   * @param includeDemo - Whether to include demo companies
   * @returns Array of unified risk data
   */
  static async getNetworkRiskData(includeDemo: boolean = true): Promise<UnifiedRiskData[]> {
    try {
      const cacheKey = `network_${includeDemo}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const whereConditions = includeDemo 
        ? undefined 
        : and(eq(companies.is_demo, false));

      const companiesData = await db.query.companies.findMany({
        where: whereConditions,
        columns: {
          id: true,
          name: true,
          risk_score: true,
          previous_risk_score: true,
          category: true,
          is_demo: true,
          updated_at: true
        },
        orderBy: (companies, { desc }) => [desc(companies.risk_score)]
      });

      const networkRiskData = companiesData.map(company => {
        const currentScore = company.risk_score || 0;
        const previousScore = company.previous_risk_score || 0;
        const status = this.calculateRiskStatus(currentScore);
        const trend = this.calculateRiskTrend(currentScore, previousScore);
        const daysInStatus = this.calculateDaysInStatus(new Date(company.updated_at));

        return {
          id: company.id,
          name: company.name,
          currentScore,
          previousScore,
          status,
          trend,
          daysInStatus,
          category: company.category || 'FinTech',
          isDemo: company.is_demo || false,
          updatedAt: new Date(company.updated_at)
        };
      });

      this.setCachedData(cacheKey, networkRiskData);
      return networkRiskData;

    } catch (error) {
      console.error('[UnifiedRiskCalculationService] Error getting network risk data:', error);
      return [];
    }
  }

  /**
   * Calculate risk metrics summary from risk data
   * @param riskData - Array of unified risk data
   * @returns Risk metrics summary
   */
  static calculateRiskMetrics(riskData: UnifiedRiskData[]): RiskMetricsSummary {
    const total = riskData.length;
    const blocked = riskData.filter(company => company.status === 'Blocked').length;
    const approaching = riskData.filter(company => company.status === 'Approaching Block').length;
    const monitoring = riskData.filter(company => company.status === 'Monitoring').length;
    const stable = riskData.filter(company => company.status === 'Stable').length;
    const blockedPercentage = total > 0 ? Math.round((blocked / total) * 100 * 10) / 10 : 0;

    return {
      total,
      blocked,
      approaching,
      monitoring,
      stable,
      blockedPercentage
    };
  }

  /**
   * Update company risk score and maintain historical data
   * @param companyId - Company ID
   * @param newRiskScore - New risk score
   * @param riskClusters - Optional risk dimension data
   */
  static async updateCompanyRiskScore(
    companyId: number, 
    newRiskScore: number,
    riskClusters?: any
  ): Promise<boolean> {
    try {
      // Get current risk score to store as previous
      const currentCompany = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: { risk_score: true }
      });

      const previousRiskScore = currentCompany?.risk_score || 0;

      // Update company with new risk score and maintain history
      await db.update(companies)
        .set({
          risk_score: newRiskScore,
          previous_risk_score: previousRiskScore,
          risk_clusters: riskClusters || null,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));

      // Clear cache for this company and network data
      this.clearCacheForCompany(companyId);
      
      console.log(`[UnifiedRiskCalculationService] Updated risk score for company ${companyId}: ${previousRiskScore} -> ${newRiskScore}`);
      return true;

    } catch (error) {
      console.error('[UnifiedRiskCalculationService] Error updating company risk score:', error);
      return false;
    }
  }

  /**
   * Get cached data if not expired
   */
  private static getCachedData(key: string): any | null {
    const cached = this.riskDataCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION_MS) {
      return cached.data;
    }
    this.riskDataCache.delete(key);
    return null;
  }

  /**
   * Set cached data with timestamp
   */
  private static setCachedData(key: string, data: any): void {
    this.riskDataCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for a specific company and network data
   */
  private static clearCacheForCompany(companyId: number): void {
    this.riskDataCache.delete(`company_${companyId}`);
    this.riskDataCache.delete('network_true');
    this.riskDataCache.delete('network_false');
  }

  /**
   * Clear all cached risk data
   */
  static clearAllCache(): void {
    this.riskDataCache.clear();
  }
}