/**
 * ========================================
 * Current Company Hook - Company Context Management
 * ========================================
 * 
 * Centralized company context hook providing current company information,
 * onboarding status, and risk assessment data throughout the enterprise
 * platform. Integrates with user context and caching for optimal performance.
 * 
 * Key Features:
 * - Current company data retrieval and caching
 * - Onboarding status tracking and validation
 * - Risk score monitoring and updates
 * - Company metadata and configuration access
 * - Real-time company state synchronization
 * 
 * Company Data:
 * - Company profile and business information
 * - Onboarding completion status
 * - Risk assessment scores and metrics
 * - Category and classification data
 * - Demo mode and testing capabilities
 * 
 * @module hooks/use-current-company
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useQuery } from '@tanstack/react-query';
import { userContext } from '@/lib/user-context';
import { useEffect } from 'react';
import getLogger from '@/utils/logger';

const logger = getLogger('CurrentCompany');

export interface Company {
  id: number;
  name: string;
  description?: string;
  category?: string;
  website_url?: string;
  onboarding_company_completed?: boolean;
  risk_score?: number;
  riskScore?: number;
  chosen_score?: number;
  available_tabs?: string[];
  isDemo?: boolean;
}

export function useCurrentCompany() {
  // Restore HTTP-based company data fetching for authentication
  const { 
    data: company, 
    isLoading, 
    isError, 
    error 
  } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Store company ID in user context when it changes
  // This is CRITICAL for proper data isolation between companies
  useEffect(() => {
    if (company?.id) {
      logger.info(`Setting company context: ${company.id}`);
      userContext.setCompanyId(company.id);
    }
  }, [company]);

  return {
    company,
    isLoading,
    isError,
    error
  };
}