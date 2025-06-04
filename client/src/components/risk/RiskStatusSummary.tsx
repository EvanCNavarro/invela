import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getSessionCompanyData } from '@/lib/sessionDataService';

interface RiskStatusSummaryProps {
  companyId: number;
  className?: string;
}

interface RiskStatusData {
  status: string;
  daysInStatus: number;
  previousStatus?: string;
  trend: 'improving' | 'stable' | 'deteriorating';
}

export function RiskStatusSummary({ companyId, className }: RiskStatusSummaryProps) {
  // Get company data to use with session service
  const { data: company } = useQuery({
    queryKey: [`/api/companies/${companyId}`],
    enabled: !!companyId
  });

  if (!company) {
    return <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />;
  }

  // Use session-consistent data
  const sessionData = getSessionCompanyData(company);

  const statusColorClass = sessionData.status === 'Stable' ? 'text-green-600' :
                          sessionData.status === 'Approaching Block' ? 'text-yellow-600' :
                          sessionData.status === 'Blocked' ? 'text-red-600' :
                          'text-gray-600';

  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("text-sm font-medium", statusColorClass)}>
        {sessionData.status}
      </p>
      <p className="text-xs text-gray-500">
        {sessionData.daysInStatus} days
      </p>
    </div>
  );
}