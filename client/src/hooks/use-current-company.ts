import { useQuery } from '@tanstack/react-query';

export interface Company {
  id: number;
  name: string;
  description?: string;
  category?: string;
  website_url?: string;
  onboarding_company_completed?: boolean;
  risk_score?: number;
  riskScore?: number;
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