import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskTrendIndicatorProps {
  companyId: number;
  className?: string;
}

interface RiskTrendData {
  change: number;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

export function RiskTrendIndicator({ companyId, className }: RiskTrendIndicatorProps) {
  const { data: trendData, isLoading } = useQuery<RiskTrendData>({
    queryKey: [`/api/companies/${companyId}/risk-trend`],
    enabled: !!companyId
  });

  if (isLoading) {
    return <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />;
  }

  if (!trendData) {
    return null;
  }

  const TrendIcon = trendData.direction === 'up' ? TrendingUp : 
                   trendData.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TrendIcon className="w-3 h-3 text-gray-900" />
      <span className="text-xs font-medium text-gray-900">
        {trendData.direction === 'stable' ? '0' : 
         `${trendData.direction === 'up' ? '+' : ''}${trendData.change}`}
      </span>
    </div>
  );
}