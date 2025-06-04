import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
  const { data: statusData, isLoading, error } = useQuery<RiskStatusData>({
    queryKey: [`/api/companies/${companyId}/risk-status`],
    enabled: !!companyId
  });

  console.log('[RiskStatusSummary] Debug:', { companyId, statusData, isLoading, error });

  if (isLoading) {
    return <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />;
  }

  if (!statusData) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const statusColorClass = statusData.status === 'Stable' ? 'text-green-600' :
                          statusData.status === 'Approaching Block' ? 'text-yellow-600' :
                          statusData.status === 'Blocked' ? 'text-red-600' :
                          'text-gray-600';

  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("text-sm font-medium", statusColorClass)}>
        {statusData.status}
      </p>
      <p className="text-xs text-gray-500">
        {statusData.daysInStatus} days
      </p>
    </div>
  );
}