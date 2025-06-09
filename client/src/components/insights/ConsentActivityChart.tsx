import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { INSIGHT_COLORS } from '@/lib/insightDesignSystem';

// Define the timeframe options
export type TimeframeOption = '1day' | '30days' | '1year';

// Props for the chart component
interface ConsentActivityChartProps {
  className?: string;
  companyId?: number;
  timeframe: TimeframeOption;
  showDropdown?: boolean;
  showLegend?: boolean;
  width?: number;
  height?: number;
}

/**
 * Get fallback consent data based on timeframe
 */
const getFallbackData = (timeframe: TimeframeOption): { active: number; newlyGranted: number } => {
  switch (timeframe) {
    case '1day':
      return { active: 17000, newlyGranted: 1000 };
    case '30days':
      return { active: 425000, newlyGranted: 25000 };
    case '1year':
      return { active: 5100000, newlyGranted: 300000 };
    default:
      return { active: 5100000, newlyGranted: 300000 };
  }
};

/**
 * Generate simple chart bars based on data
 */
const generateChartBars = (data: { active: number; newlyGranted: number }) => {
  const maxValue = Math.max(data.active, data.newlyGranted);
  
  return [
    {
      label: 'Active Consents',
      value: data.active,
      percentage: (data.active / maxValue) * 100,
      color: INSIGHT_COLORS.primary.blue
    },
    {
      label: 'Newly Granted',
      value: data.newlyGranted,
      percentage: (data.newlyGranted / maxValue) * 100,
      color: INSIGHT_COLORS.primary.green
    }
  ];
};

/**
 * Format numbers for display
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Simple Consent Activity Chart Component
 */
export function ConsentActivityChart({
  className = '',
  companyId,
  timeframe,
  showDropdown = false,
  showLegend = false,
  width,
  height
}: ConsentActivityChartProps) {
  
  // Generate chart data based on timeframe
  const chartData = useMemo(() => {
    const data = getFallbackData(timeframe);
    return generateChartBars(data);
  }, [timeframe]);

  return (
    <div className={`w-full ${className}`} style={{ width, height }}>
      <div className="space-y-4">
        {/* Simple bar chart visualization */}
        <div className="space-y-3">
          {chartData.map((bar, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{bar.label}</span>
                <span className="font-medium">{formatNumber(bar.value)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${bar.percentage}%`,
                    backgroundColor: bar.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Timeframe indicator */}
        <div className="text-xs text-gray-500 text-center">
          Showing data for {timeframe === '1day' ? '24 hours' : timeframe === '30days' ? '30 days' : '1 year'}
        </div>
      </div>
    </div>
  );
}