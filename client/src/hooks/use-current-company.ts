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
  isDemo?: boolean;
}

export function useCurrentCompany() {
  const { 
    data: company, 
    isLoading, 
    isError, 
    error 
  } = useQuery<Company>({ 
    queryKey: ['/api/companies/current'],
    retry: 2,
    refetchOnWindowFocus: false
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