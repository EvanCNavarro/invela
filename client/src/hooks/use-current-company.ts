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

import { userContext } from '@/lib/user-context';
import { useEffect, useState } from 'react';
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
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Import WebSocket hook dynamically to avoid circular dependencies
    import('@/hooks/useUnifiedWebSocket').then(({ useUnifiedWebSocket }) => {
      const { subscribe } = useUnifiedWebSocket();
      
      // Subscribe to company data updates (replaces HTTP polling)
      const unsubscribe = subscribe('company_data', (data: Company) => {
        logger.info('Received company data update:', data);
        setCompany(data);
        setIsLoading(false);
        setIsError(false);
        setError(null);
      });

      // Subscribe to initial data (includes company data)
      const unsubscribeInitial = subscribe('initial_data', (data: any) => {
        if (data.company) {
          logger.info('Received initial company data:', data.company);
          setCompany(data.company);
          setIsLoading(false);
          setIsError(false);
          setError(null);
        }
      });

      return () => {
        unsubscribe();
        unsubscribeInitial();
      };
    }).catch((err) => {
      logger.error('Failed to setup WebSocket listeners for company data:', err);
      setIsError(true);
      setError(err);
      setIsLoading(false);
    });
  }, []);

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