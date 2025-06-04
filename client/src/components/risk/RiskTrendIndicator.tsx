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

  const colorClass = trendData.direction === 'up' ? 'text-red-500' : 
                     trendData.direction === 'down' ? 'text-green-500' : 
                     'text-gray-400';

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TrendIcon className={cn("w-3 h-3", colorClass)} />
      <span className={cn("text-xs font-medium", colorClass)}>
        {trendData.direction === 'stable' ? '0' : 
         `${trendData.direction === 'up' ? '+' : ''}${trendData.change}`}
      </span>
    </div>
  );
}