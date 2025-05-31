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
    let isMounted = true;
    
    // HTTP-first authentication: Load initial company data via reliable HTTP request
    const loadInitialCompanyData = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);
        
        const response = await fetch('/api/companies/current', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch company data: ${response.status}`);
        }
        
        const companyData = await response.json();
        
        if (isMounted) {
          logger.info('Loaded initial company data via HTTP:', companyData);
          setCompany(companyData);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Failed to load initial company data:', err);
          setIsError(true);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    // Load initial data immediately
    loadInitialCompanyData();

    // Set up WebSocket for live updates after initial HTTP load
    let websocketCleanup: (() => void) | null = null;
    
    import('@/services/websocket-unified').then(({ unifiedWebSocketService }) => {
      // Subscribe to company data updates (real-time updates only)
      websocketCleanup = unifiedWebSocketService.subscribe('company_data', (data: Company) => {
        if (isMounted) {
          logger.info('Received real-time company data update:', data);
          setCompany(data);
        }
      });
    }).catch((err) => {
      logger.error('Failed to setup WebSocket listeners for company updates:', err);
    });

    return () => {
      isMounted = false;
      if (websocketCleanup) {
        websocketCleanup();
      }
    };
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