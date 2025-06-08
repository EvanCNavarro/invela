import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface RiskStatusSummaryProps {
  companyId: number;
  className?: string;
}

export function RiskStatusSummary({ companyId, className }: RiskStatusSummaryProps) {
  // Use unified risk data for consistency
  const { data: unifiedRiskData } = useQuery<{
    id: number;
    name: string;
    currentScore: number;
    previousScore: number;
    status: 'Stable' | 'Monitoring' | 'Approaching Block' | 'Blocked';
    trend: 'improving' | 'stable' | 'deteriorating';
    daysInStatus: number;
    category: string;
    isDemo: boolean;
    updatedAt: string;
  }>({
    queryKey: [`/api/companies/${companyId}/risk-unified`],
    enabled: !!companyId
  });

  if (!unifiedRiskData) {
    return <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm font-medium text-gray-900">
        {unifiedRiskData.status}
      </p>
      <p className="text-xs text-gray-500">
        {unifiedRiskData.daysInStatus} days
      </p>
    </div>
  );
}