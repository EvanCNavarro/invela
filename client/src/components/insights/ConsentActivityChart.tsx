import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { NetworkNode } from '@/components/network/types';
import { Loader2 } from 'lucide-react';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ResponsiveChartWrapper } from '@/components/ui/responsive-chart-wrapper';

// Define the timeframe options
export type TimeframeOption = '1day' | '30days' | '1year';

// Chart data point interface
interface ChartDataPoint {
  x: string | Date;
  y: number;
}

// Series data for the chart
interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

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
 * Helper function to generate a deterministic consent count for a company
 * This matches the existing algorithm in ConnectionDetails.tsx
 */
const getActiveConsents = (companyId: number | undefined): number => {
  // If no company ID, return 0
  if (!companyId) return 0;
  
  // Use the company ID as a seed to ensure consistent numbers
  const seed = companyId;
  const min = 100000;
  const max = 50000000;
  
  // Use a deterministic random generation based on company ID
  const randomValue = Math.sin(seed) * 10000;
  const normalized = Math.abs(randomValue - Math.floor(randomValue));
  
  // Scale to our range
  return Math.floor(min + normalized * (max - min));
};

/**
 * Calculate newly granted consents using an enhanced algorithm
 * that provides more volume and greater variance
 */
const getNewlyGrantedConsents = (activeConsents: number): number => {
  // Use a more optimistic ratio (12:1 instead of 17:1) to increase volume
  const baseValue = activeConsents / 12;
  
  // Add higher variance (±25%) to make the pattern more dynamic
  // This creates more pronounced peaks and valleys in the newly granted data
  const varianceFactor = 0.75 + (Math.random() * 0.5); // 0.75 to 1.25
  
  // Apply seasonal adjustment to create more realistic patterns
  const seasonalAdjustment = 1 + (Math.sin(Math.random() * Math.PI) * 0.15); // 0.85 to 1.15
  
  return Math.round(baseValue * varianceFactor * seasonalAdjustment);
};

/**
 * Get fallback consent data based on timeframe
 * These values match the specified requirements
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
      return { active: 5100000, newlyGranted: 300000 }; // Default to 1year
  }
};

/**
 * Generate time series data points based on timeframe
 */
const generateTimeSeriesData = (
  timeframe: TimeframeOption,
  totalValue: number,
  label: string
): ChartDataPoint[] => {
  const now = new Date();
  const dataPoints: ChartDataPoint[] = [];
  
  // Customize the time intervals based on timeframe
  if (timeframe === '1day') {
    // For 1 day, show hourly data (24 points)
    const baseValuePerHour = totalValue / 24; // Distribute the total value over 24 hours
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(now);
      date.setHours(i, 0, 0, 0);
      
      // Add slight randomness to make chart more realistic
      // Values tend to increase during business hours (9am-5pm)
      let hourMultiplier = 1;
      if (i >= 9 && i <= 17) {
        hourMultiplier = 1.2; // Higher during business hours
      } else if (i >= 0 && i <= 5) {
        hourMultiplier = 0.7; // Lower during early morning
      }
      
      // Add randomness while preserving the approximate total
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const value = Math.round(baseValuePerHour * hourMultiplier * randomFactor);
      
      dataPoints.push({
        x: date,
        y: value
      });
    }
  } else if (timeframe === '30days') {
    // For 30 days, show daily data (30 points)
    const baseValuePerDay = totalValue / 30;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      date.setHours(0, 0, 0, 0);
      
      // Add slight randomness for weekdays vs weekends
      const dayOfWeek = date.getDay();
      let dayMultiplier = 1;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayMultiplier = 0.8; // Lower on weekends
      }
      
      // Add randomness while preserving the approximate total
      const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
      const value = Math.round(baseValuePerDay * dayMultiplier * randomFactor);
      
      dataPoints.push({
        x: date,
        y: value
      });
    }
  } else {
    // For 1 year, show monthly data (12 points)
    const baseValuePerMonth = totalValue / 12;
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (11 - i));
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      
      // Seasonal variations with Q1 lower, Q2 & Q3 higher, Q4 highest
      let monthMultiplier = 1;
      const month = date.getMonth();
      
      if (month >= 0 && month <= 2) {
        monthMultiplier = 0.85; // Q1 lower
      } else if (month >= 3 && month <= 5) {
        monthMultiplier = 1.05; // Q2 higher
      } else if (month >= 6 && month <= 8) {
        monthMultiplier = 1.0; // Q3 baseline
      } else {
        monthMultiplier = 1.1; // Q4 highest
      }
      
      // Add randomness while preserving the approximate total
      const randomFactor = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
      const value = Math.round(baseValuePerMonth * monthMultiplier * randomFactor);
      
      dataPoints.push({
        x: date,
        y: value
      });
    }
  }

  // Sort by date to ensure correct ordering
  return dataPoints.sort((a, b) => {
    const dateA = a.x instanceof Date ? a.x : new Date(a.x);
    const dateB = b.x instanceof Date ? b.x : new Date(b.x);
    return dateA.getTime() - dateB.getTime();
  });
};

/**
 * Format numbers to k/m format with rounding as needed
 */
const formatYAxisNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return value.toString();
};

/**
 * Internal component that renders the consent activity chart with responsive dimensions
 */
function ConsentActivityChartInternal({ 
  className = '',
  companyId,
  timeframe = '1year',
  showDropdown = true,
  showLegend = true,
  width = 800,
  height = 500
}: ConsentActivityChartProps) {
  // Reference for the ApexCharts component
  const chartRef = useRef<any>(null);
  
  // State for dynamic loading of ApexCharts
  const [chartComponentLoaded, setChartComponentLoaded] = useState<boolean>(false);
  const [ReactApexChart, setReactApexChart] = useState<any>(null);
  
  // Fetch network data to get company information
  const { data: networkData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/network/visualization'],
    enabled: true
  });
  
  // Get related company data for the selected company
  const selectedCompany = React.useMemo(() => {
    if (!networkData || !companyId) return null;
    
    // If companyId matches the center node, use that
    if (networkData.center.id === companyId) {
      return networkData.center;
    }
    
    // Otherwise, find the company in the nodes list
    return networkData.nodes.find((node: NetworkNode) => node.id === companyId) || null;
  }, [networkData, companyId]);
  
  // Determine if we should use fallback data
  const shouldUseFallback = React.useMemo(() => {
    return !selectedCompany || !companyId;
  }, [selectedCompany, companyId]);
  
  // Calculate consents data - either from the selected company or fallback values
  const consentsData = React.useMemo(() => {
    if (shouldUseFallback) {
      console.log('[ConsentActivityChart] Using fallback data for timeframe:', timeframe);
      return getFallbackData(timeframe);
    }
    
    const activeConsents = getActiveConsents(companyId);
    const newlyGranted = getNewlyGrantedConsents(activeConsents);
    
    console.log('[ConsentActivityChart] Calculated consents data:', {
      companyId,
      activeConsents,
      newlyGranted
    });
    
    return {
      active: activeConsents,
      newlyGranted
    };
  }, [companyId, shouldUseFallback, timeframe]);
  
  // Generate time series data for the chart
  const chartSeries = React.useMemo(() => {
    return [
      {
        name: 'Active Consents',
        data: generateTimeSeriesData(timeframe, consentsData.active, 'Active Consents')
      },
      {
        name: 'Newly Granted Consents',
        data: generateTimeSeriesData(timeframe, consentsData.newlyGranted, 'Newly Granted Consents')
      }
    ];
  }, [timeframe, consentsData]);
  
  // Load ApexCharts dynamically on the client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-apexcharts').then((mod) => {
        setReactApexChart(() => mod.default);
        setChartComponentLoaded(true);
      }).catch(err => {
        console.error("Error loading ApexCharts:", err);
      });
    }
  }, []);
  
  // Configure ApexCharts options
  const chartOptions = {
    chart: {
      type: 'area',
      height: height,
      width: width,
      fontFamily: 'inherit',
      toolbar: {
        show: false,
      },
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      parentHeightOffset: 0,
    },
    colors: ['#4965EC', '#6EE7B7'], // Primary blue for active, green for newly granted
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    },
    stroke: {
      curve: 'smooth',
      width: [2, 2],
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      strokeDashArray: 4,
      borderColor: '#E9E9EF',
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 30,
        right: 50,
        bottom: 40,
        left: 50
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px',
          fontFamily: 'inherit',
          fontWeight: 400,
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: timeframe === '1year' ? 'MMM' : "MMM 'yy",
          day: 'dd MMM',
          hour: timeframe === '1day' ? 'HH:mm' : undefined,
        },
        offsetY: 8,
        offsetX: 0,
        rotate: 0,
        trim: false,
        textAnchor: 'middle',
      },
      tooltip: {
        enabled: false
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        formatter: formatYAxisNumber,
        style: {
          colors: '#64748b',
          fontSize: '12px',
          fontFamily: 'inherit',
          fontWeight: 400,
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    legend: {
      show: showLegend,
      position: 'top',
      horizontalAlign: 'right',
      offsetY: 15,
      labels: {
        colors: '#334155'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 12,
        offsetX: -3
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => {
          return formatYAxisNumber(value);
        }
      },
      x: {
        format: timeframe === '1day' 
          ? 'HH:mm' 
          : timeframe === '30days' 
            ? 'dd MMM' 
            : 'MMM yyyy'
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 6
      },
      discrete: [{
        seriesIndex: 0,
        dataPointIndex: -1, // Last point in series
        size: 5,
        fillColor: '#4965EC',
        strokeColor: '#fff',
        strokeWidth: 2
      }, {
        seriesIndex: 1,
        dataPointIndex: -1, // Last point in series
        size: 5,
        fillColor: '#6EE7B7',
        strokeColor: '#fff',
        strokeWidth: 2
      }]
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2" style={{ height }}>
        <div className="text-destructive font-medium">Failed to load data</div>
        <div className="text-xs text-muted-foreground max-w-md">
          {error instanceof Error ? error.message : 'Check console for details'}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={`${className}`}>
      <CardContent className="p-6">
        {!chartComponentLoaded ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div style={{ height, width }}>
            {ReactApexChart && (
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height={height}
                width="100%"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Responsive ConsentActivityChart component with error boundary
 * Automatically adapts to container dimensions and provides graceful error handling
 */
export function ConsentActivityChart({ className, ...props }: { className?: string } & Omit<ConsentActivityChartProps, 'width' | 'height'>) {
  return (
    <ChartErrorBoundary>
      <ResponsiveChartWrapper 
        className={className}
        aspectRatio={16/10}
        minWidth={400}
      >
        {({ width, height }) => (
          <ConsentActivityChartInternal 
            width={width} 
            height={height} 
            {...props} 
          />
        )}
      </ResponsiveChartWrapper>
    </ChartErrorBoundary>
  );
}