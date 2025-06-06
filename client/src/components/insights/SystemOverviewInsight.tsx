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
          period: startDate.toLocaleTimeString('en-US', { hour: 'numeric' }),
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
          period: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
          period: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
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
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('30days');

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
    <div className={cn("space-y-6", className)}>
      {/* Header with Time Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Platform Enrollment & Accreditation Timeline</h3>
          <p className="text-sm text-gray-600 mt-1">Company enrollments and accreditations over time by persona type</p>
        </div>
        
        <ToggleGroup 
          type="single" 
          value={selectedTimeframe} 
          onValueChange={(value) => value && setSelectedTimeframe(value as TimeframeOption)}
          className="bg-gray-100 rounded-lg"
        >
          <ToggleGroupItem value="1day" className="px-3 py-1.5 text-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white">
            {getTimeframeLabel('1day')}
          </ToggleGroupItem>
          <ToggleGroupItem value="30days" className="px-3 py-1.5 text-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white">
            {getTimeframeLabel('30days')}
          </ToggleGroupItem>
          <ToggleGroupItem value="1year" className="px-3 py-1.5 text-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white">
            {getTimeframeLabel('1year')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Network Summary Card */}
      {summaryStats && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">
              <strong className="text-gray-900">Invela Trust Network</strong> Overview: <strong className="text-gray-900">{summaryStats.dataProviders + summaryStats.dataRecipients + 1}</strong> Total Companies — <strong className="text-gray-900">{summaryStats.accreditedDataRecipients}</strong> Active Accreditations ({Math.round((summaryStats.accreditedDataRecipients / (summaryStats.dataProviders + summaryStats.dataRecipients + 1)) * 100)}%)
            </span>
          </div>
        </div>
      )}

      {/* Summary Stats Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Data Providers</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{summaryStats.dataProviders}</p>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Data Recipients</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{summaryStats.dataRecipients}</p>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Accredited Recipients</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{summaryStats.accreditedDataRecipients}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg border p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading enrollment data...</span>
            </div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  tickFormatter={(value) => {
                    // Extract month from date string (YYYY-MM format)
                    const date = new Date(value + '-01');
                    return date.toLocaleDateString('en-US', { month: 'short' });
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '13px', 
                    paddingTop: '25px',
                    lineHeight: '22px'
                  }}
                  iconSize={12}
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
                  fill="#2563eb"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-80">
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