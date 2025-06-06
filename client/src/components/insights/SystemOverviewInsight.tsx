/**
 * ========================================
 * System Overview Insight Component
 * ========================================
 * 
 * Comprehensive system analytics for Invela administrators showing:
 * - Company enrollment metrics by persona type
 * - Accreditation timeline tracking
 * - Time-based filtering and visualization
 * - Beautiful bar charts with hover interactions
 * 
 * Features:
 * - Real-time data from authentic database sources
 * - Interactive time filters (1 day, 30 days, 1 year)
 * - Persona-specific enrollment tracking
 * - Accreditation vs enrollment comparison
 * - Responsive design with smooth animations
 * 
 * @module SystemOverviewInsight
 * @version 1.0.0
 * @since 2025-06-06
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Loader2, Users, Shield, Building, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ========================================
// TYPES & INTERFACES
// ========================================

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

interface PersonaStats {
  total: number;
  accredited: number;
  recentEnrollments: number;
  recentAccreditations: number;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Process raw company data into enrollment statistics
 */
const processEnrollmentData = (
  companies: any[],
  accreditations: any[],
  timeframe: TimeframeOption
): EnrollmentData[] => {
  const now = new Date();
  const periods: EnrollmentData[] = [];
  
  // Define time periods based on selected timeframe
  const getTimePeriods = (timeframe: TimeframeOption) => {
    switch (timeframe) {
      case '1day':
        // Last 24 hours by hour
        return Array.from({ length: 24 }, (_, i) => {
          const date = new Date(now);
          date.setHours(now.getHours() - (23 - i), 0, 0, 0);
          return {
            period: date.toLocaleTimeString('en-US', { hour: 'numeric' }),
            date: date
          };
        });
      case '30days':
        // Last 30 days
        return Array.from({ length: 30 }, (_, i) => {
          const date = new Date(now);
          date.setDate(now.getDate() - (29 - i));
          return {
            period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            date: date
          };
        });
      case '1year':
        // Last 12 months
        return Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(now.getMonth() - (11 - i));
          return {
            period: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            date: date
          };
        });
      default:
        return [];
    }
  };

  const timePeriods = getTimePeriods(timeframe);

  timePeriods.forEach(({ period, date }) => {
    const nextPeriod = new Date(date);
    
    switch (timeframe) {
      case '1day':
        nextPeriod.setHours(date.getHours() + 1);
        break;
      case '30days':
        nextPeriod.setDate(date.getDate() + 1);
        break;
      case '1year':
        nextPeriod.setMonth(date.getMonth() + 1);
        break;
    }

    // Count companies enrolled in this period
    const enrolledInPeriod = companies.filter(company => {
      const createdAt = new Date(company.created_at);
      return createdAt >= date && createdAt < nextPeriod && company.persona_type !== 'Invela Admin';
    });

    // Count accreditations completed in this period
    const accreditedInPeriod = accreditations.filter(acc => {
      const accreditedAt = new Date(acc.created_at);
      return accreditedAt >= date && accreditedAt < nextPeriod;
    });

    const dataRecipients = enrolledInPeriod.filter(c => 
      c.persona_type === 'New Data Recipient'
    ).length;

    const accreditedDataRecipients = enrolledInPeriod.filter(c => 
      c.persona_type === 'Accredited Data Recipient'
    ).length;

    const dataProviders = enrolledInPeriod.filter(c => 
      c.persona_type === 'Data Provider'
    ).length;

    periods.push({
      period,
      dataRecipients,
      accreditedDataRecipients,
      dataProviders,
      totalAccreditations: accreditedInPeriod.length
    });
  });

  return periods;
};

/**
 * Calculate summary statistics for each persona type
 */
const calculatePersonaStats = (companies: any[], accreditations: any[]): Record<string, PersonaStats> => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getStatsForPersona = (personaType: string) => {
    const companiesOfType = companies.filter(c => c.persona_type === personaType);
    const recentEnrollments = companiesOfType.filter(c => 
      new Date(c.created_at) >= thirtyDaysAgo
    ).length;

    // For accreditation stats, we need to check the accreditation_history
    const accreditedCompanies = companiesOfType.filter(c => c.accreditation_status === 'APPROVED');
    const recentAccreditations = accreditations.filter(acc => {
      const company = companies.find(c => c.id === acc.company_id);
      return company && 
             company.persona_type === personaType && 
             new Date(acc.created_at) >= thirtyDaysAgo;
    }).length;

    return {
      total: companiesOfType.length,
      accredited: accreditedCompanies.length,
      recentEnrollments,
      recentAccreditations
    };
  };

  return {
    'New Data Recipient': getStatsForPersona('New Data Recipient'),
    'Accredited Data Recipient': getStatsForPersona('Accredited Data Recipient'),
    'Data Provider': getStatsForPersona('Data Provider')
  };
};

// ========================================
// MAIN COMPONENT
// ========================================

export function SystemOverviewInsight({ className = '' }: SystemOverviewInsightProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30days');

  // Fetch companies data
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<any[]>({
    queryKey: ['/api/companies'],
  });

  // Fetch accreditation history
  const { data: accreditations = [], isLoading: isLoadingAccreditations } = useQuery<any[]>({
    queryKey: ['/api/accreditation-history'],
  });

  // Get current company to verify this is Invela admin
  const { data: currentCompany } = useQuery<any>({
    queryKey: ['/api/companies/current'],
  });

  // Process data for visualization
  const enrollmentData = useMemo(() => {
    if (!companies.length || !accreditations.length) return [];
    return processEnrollmentData(companies, accreditations, timeframe);
  }, [companies, accreditations, timeframe]);

  // Calculate persona statistics
  const personaStats = useMemo(() => {
    if (!companies.length || !accreditations.length) return {};
    return calculatePersonaStats(companies, accreditations);
  }, [companies, accreditations]);

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    if (value === '1day' || value === '30days' || value === '1year') {
      setTimeframe(value);
    }
  };

  // Only show for Invela administrators
  if (currentCompany && currentCompany.category !== 'Invela') {
    return null;
  }

  // Loading state
  if (isLoadingCompanies || isLoadingAccreditations) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">System Overview</h3>
          <p className="text-sm text-gray-600">Platform enrollment and accreditation metrics</p>
        </div>
        
        <ToggleGroup type="single" value={timeframe} onValueChange={handleTimeframeChange}>
          <ToggleGroupItem value="1day" aria-label="Last 24 hours">
            24h
          </ToggleGroupItem>
          <ToggleGroupItem value="30days" aria-label="Last 30 days">
            30d
          </ToggleGroupItem>
          <ToggleGroupItem value="1year" aria-label="Last year">
            1y
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(personaStats).map(([personaType, stats]) => {
          const getPersonaIcon = (persona: string) => {
            switch (persona) {
              case 'Data Provider':
                return <Building className="h-5 w-5 text-blue-600" />;
              case 'Accredited Data Recipient':
                return <Shield className="h-5 w-5 text-green-600" />;
              default:
                return <Users className="h-5 w-5 text-purple-600" />;
            }
          };

          const getPersonaColor = (persona: string) => {
            switch (persona) {
              case 'Data Provider':
                return 'border-blue-200 bg-blue-50';
              case 'Accredited Data Recipient':
                return 'border-green-200 bg-green-50';
              default:
                return 'border-purple-200 bg-purple-50';
            }
          };

          return (
            <Card key={personaType} className={cn('transition-all hover:shadow-md', getPersonaColor(personaType))}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {personaType}
                </CardTitle>
                {getPersonaIcon(personaType)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.accredited} accredited • {stats.recentEnrollments} new (30d)
                </p>
                {stats.recentAccreditations > 0 && (
                  <div className="flex items-center mt-2 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats.recentAccreditations} recent accreditations
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enrollment Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment & Accreditation Timeline</CardTitle>
          <CardDescription>
            Company enrollments and accreditations over time by persona type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'medium' }}
                />
                <Legend />
                <Bar 
                  dataKey="dataProviders" 
                  fill="#3b82f6" 
                  name="Data Providers"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="dataRecipients" 
                  fill="#8b5cf6" 
                  name="New Data Recipients"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="accreditedDataRecipients" 
                  fill="#10b981" 
                  name="Accredited Data Recipients"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="totalAccreditations" 
                  fill="#f59e0b" 
                  name="Accreditations Completed"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemOverviewInsight;