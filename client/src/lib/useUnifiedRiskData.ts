/**
 * Unified Risk Data Hook
 * 
 * Single hook for all risk data fetching across the application.
 * Replaces multiple independent data sources with consistent API calls.
 * 
 * Usage Examples:
 * - Dashboard widgets: useUnifiedRiskData({ includeNetwork: true })
 * - Company profiles: useUnifiedRiskData({ companyId: 123 })
 * - Network page: useUnifiedRiskData({ includeNetwork: true, includeDemo: false })
 */

import { useQuery } from '@tanstack/react-query';

export interface UnifiedRiskData {
  id: number;
  name: string;
  currentScore: number;
  previousScore: number;
  status: 'Blocked' | 'Approaching Block' | 'Monitoring' | 'Stable';
  trend: 'improving' | 'stable' | 'deteriorating';
  daysInStatus: number;
  category: string;
  isDemo: boolean;
  updatedAt: string;
}

export interface RiskMetricsSummary {
  total: number;
  blocked: number;
  approaching: number;
  monitoring: number;
  stable: number;
  blockedPercentage: number;
}

export interface RiskThresholds {
  BLOCKED: number;
  APPROACHING_BLOCK: number;
  MONITORING: number;
  STABLE: number;
}

export interface UnifiedRiskResponse {
  company?: UnifiedRiskData;
  companies?: UnifiedRiskData[];
  metrics?: RiskMetricsSummary;
  thresholds: RiskThresholds;
}

export interface UseUnifiedRiskDataOptions {
  companyId?: number;
  includeNetwork?: boolean;
  includeDemo?: boolean;
  enabled?: boolean;
}

/**
 * Hook for fetching unified risk data
 * @param options - Configuration options for the request
 * @returns Query result with unified risk data
 */
export function useUnifiedRiskData(options: UseUnifiedRiskDataOptions = {}) {
  const {
    companyId,
    includeNetwork = false,
    includeDemo = true,
    enabled = true
  } = options;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (companyId) queryParams.set('companyId', companyId.toString());
  if (includeNetwork) queryParams.set('includeNetwork', 'true');
  if (!includeDemo) queryParams.set('includeDemo', 'false');

  const queryString = queryParams.toString();
  const url = `/api/risk/unified${queryString ? `?${queryString}` : ''}`;

  return useQuery<UnifiedRiskResponse>({
    queryKey: ['/api/risk/unified', { companyId, includeNetwork, includeDemo }],
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook specifically for company risk data
 * @param companyId - Company ID to fetch risk data for
 * @param enabled - Whether the query should run
 * @returns Query result with company risk data
 */
export function useCompanyRiskData(companyId: number, enabled: boolean = true) {
  return useUnifiedRiskData({
    companyId,
    enabled: enabled && !!companyId
  });
}

/**
 * Hook specifically for network risk data
 * @param includeDemo - Whether to include demo companies
 * @param enabled - Whether the query should run
 * @returns Query result with network risk data
 */
export function useNetworkRiskData(includeDemo: boolean = true, enabled: boolean = true) {
  return useUnifiedRiskData({
    includeNetwork: true,
    includeDemo,
    enabled
  });
}

/**
 * Hook for getting just the risk thresholds
 * @returns Query result with risk thresholds
 */
export function useRiskThresholds() {
  return useUnifiedRiskData({
    enabled: true
  });
}