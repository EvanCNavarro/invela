import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Loader2, Users, Shield, Building, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemOverviewInsightProps {
  className?: string;
}

type TimeframeOption = '1day' | '30days' | '1year';

interface EnrollmentData {
  period: string;
  dataRecipients: number;
  accreditedDataRecipients: number;
  dataProviders: number;
  totalAccreditations: number;
}

/**
 * Calculate summary statistics for each persona type
 */
const calculatePersonaStats = (companies: any[], accreditations: any[], timeframe: TimeframeOption) => {
  const now = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case '1day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const dataProviders = companies.filter(c => c.category === 'Bank');
  const dataRecipients = companies.filter(c => c.category === 'FinTech');
  const accreditedRecipients = dataRecipients.filter(c => 
    accreditations.some(a => a.company_id === c.id && a.status === 'active')
  );

  const recentEnrollments = companies.filter(c => 
    new Date(c.created_at) >= startDate
  );

  const recentAccreditations = accreditations.filter(a => 
    new Date(a.issued_date || a.created_at) >= startDate && a.status === 'active'
  );

  return {
    dataProviders: dataProviders.length,
    dataRecipients: dataRecipients.length,
    accreditedDataRecipients: accreditedRecipients.length,
    recentEnrollments: recentEnrollments.length,
    recentAccreditations: recentAccreditations.length
  };
};

/**
 * Generate time-series data for the selected timeframe
 */
const generateTimeSeriesData = (companies: any[], accreditations: any[], timeframe: TimeframeOption): EnrollmentData[] => {
  const now = new Date();
  const data: EnrollmentData[] = [];
  
  let periods: Array<{ period: string; startDate: Date; endDate: Date }> = [];
  
  switch (timeframe) {
    case '1day':
      // Last 24 hours by hour
      periods = Array.from({ length: 24 }, (_, i) => {
        const startDate = new Date(now);
        startDate.setHours(now.getHours() - (23 - i), 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1);
        return {
          period: startDate.toISOString(),
          startDate,
          endDate
        };
      });
      break;
    case '30days':
      // Last 30 days
      periods = Array.from({ length: 30 }, (_, i) => {
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (29 - i));
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);
        return {
          period: startDate.toISOString(),
          startDate,
          endDate
        };
      });
      break;
    case '1year':
      // Last 12 months
      periods = Array.from({ length: 12 }, (_, i) => {
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - (11 - i));
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        return {
          period: startDate.toISOString(),
          startDate,
          endDate
        };
      });
      break;
  }

  periods.forEach(({ period, startDate, endDate }) => {
    const periodCompanies = companies.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= startDate && createdAt < endDate;
    });

    const periodAccreditations = accreditations.filter(a => {
      const createdAt = new Date(a.issued_date || a.created_at);
      return createdAt >= startDate && createdAt < endDate && a.status === 'active';
    });

    const dataProviders = periodCompanies.filter(c => c.category === 'Bank').length;
    const dataRecipients = periodCompanies.filter(c => c.category === 'FinTech').length;
    const accreditedDataRecipients = periodAccreditations.length;
    const totalAccreditations = periodAccreditations.length;

    data.push({
      period,
      dataRecipients,
      accreditedDataRecipients,
      dataProviders,
      totalAccreditations
    });
  });

  return data;
};

export function SystemOverviewInsight({ className = '' }: SystemOverviewInsightProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('1year');

  // Fetch ALL companies in the system for system-wide overview
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies/all'],
  });

  // Fetch ALL accreditations in the system for system-wide overview
  const { data: accreditations = [], isLoading: accreditationsLoading } = useQuery({
    queryKey: ['/api/accreditations/all'],
  });

  const isLoading = companiesLoading || accreditationsLoading;

  // Generate chart data based on authentic company enrollment data
  const chartData = useMemo(() => {
    if (!companies.length || !accreditations.length) return [];
    return generateTimeSeriesData(companies, accreditations, selectedTimeframe);
  }, [companies, accreditations, selectedTimeframe]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!companies.length) return null;
    return calculatePersonaStats(companies, accreditations, selectedTimeframe);
  }, [companies, accreditations, selectedTimeframe]);

  const getTimeframeLabel = (timeframe: TimeframeOption) => {
    switch (timeframe) {
      case '1day': return '1 Day';
      case '30days': return '30 Days';
      case '1year': return '1 Year';
      default: return timeframe;
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary Stats Cards - Company Overview Style */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Data Providers Card */}
          <div className="relative bg-white rounded-lg border shadow-sm text-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600"></div>
            <div className="p-3 pl-4">
              <div className="widget-text mb-3">Data Providers</div>
              <div className="widget-number text-xl">{summaryStats.dataProviders}</div>
            </div>
          </div>
          
          {/* Data Recipients Card */}
          <div className="relative bg-white rounded-lg border shadow-sm text-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-600"></div>
            <div className="p-3 pl-4">
              <div className="widget-text mb-3">Data Recipients</div>
              <div className="widget-number text-xl">{summaryStats.dataRecipients}</div>
            </div>
          </div>
          
          {/* Accredited Recipients Card */}
          <div className="relative bg-white rounded-lg border shadow-sm text-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
            <div className="p-3 pl-4">
              <div className="widget-text mb-3">Accredited Recipients</div>
              <div className="widget-number text-xl">{summaryStats.accreditedDataRecipients}</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg border pt-3 px-3 pb-0">
        {/* Chart Header with Time Selector on Right */}
        <div className="flex items-center justify-end mb-3">
          <ToggleGroup
            type="single"
            value={selectedTimeframe}
            onValueChange={(value) => value && setSelectedTimeframe(value as TimeframeOption)}
            className="border rounded-md p-0.5 bg-gray-50"
            variant="outline"
          >
            <ToggleGroupItem 
              value="1day" 
              aria-label="1 Day view" 
              className="text-sm px-6 py-2 h-8 min-w-[60px] data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300"
            >
              1D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="30days" 
              aria-label="30 Days view" 
              className="text-sm px-6 py-2 h-8 min-w-[60px] data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300"
            >
              30D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="1year" 
              aria-label="1 Year view" 
              className="text-sm px-6 py-2 h-8 min-w-[60px] data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300"
            >
              1Y
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Chart Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading enrollment data...</span>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }} 
                maxBarSize={50}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
                  height={20}
                  tickFormatter={(value) => {
                    try {
                      const date = new Date(value);
                      if (isNaN(date.getTime())) {
                        return value;
                      }
                      
                      if (selectedTimeframe === '1year') {
                        return date.toLocaleDateString('en-US', { month: 'short' });
                      } else if (selectedTimeframe === '30days') {
                        return date.getDate().toString();
                      } else {
                        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      }
                    } catch (error) {
                      return value;
                    }
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
                  width={35}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />

                <Bar 
                  dataKey="dataProviders" 
                  name="Data Providers" 
                  fill="#9333ea"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="dataRecipients" 
                  name="Data Recipients" 
                  fill="#10b981"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="accreditedDataRecipients" 
                  name="Accredited Recipients" 
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No enrollment data available</p>
              <p className="text-sm">Data will appear as companies enroll in the platform</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}