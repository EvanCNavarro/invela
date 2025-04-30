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

  return {
    company,
    isLoading,
    isError,
    error
  };
}