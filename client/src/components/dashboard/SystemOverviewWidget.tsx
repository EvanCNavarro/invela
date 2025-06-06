import { Widget } from "./Widget";
import { Building2, Users, Shield, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemOverviewWidgetProps {
  onToggle?: () => void;
  isVisible?: boolean;
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
  const totalCompanies = companies?.length || 0;
  const totalAccreditations = accreditations?.filter(acc => acc.status === 'ACTIVE')?.length || 0;
  
  const banks = companies?.filter(c => c.category === 'Bank')?.length || 0;
  const fintech = companies?.filter(c => c.category === 'FinTech')?.length || 0;

  return {
    totalCompanies,
    totalAccreditations,
    dataProviders: banks,
    dataRecipients: fintech, 
    accreditedDataRecipients: totalAccreditations
  };
};

/**
 * Generate time-series data for the selected timeframe
 */
const generateTimeSeriesData = (companies: any[], accreditations: any[], timeframe: TimeframeOption): EnrollmentData[] => {
  const now = new Date();
  let startDate: Date;
  let periods: Array<{ period: string; startDate: Date; endDate: Date }> = [];

  if (timeframe === '1day') {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    
    for (let hour = 0; hour < 24; hour++) {
      const periodStart = new Date(startDate);
      periodStart.setHours(hour);
      const periodEnd = new Date(periodStart);
      periodEnd.setHours(hour + 1);
      
      periods.push({
        period: periodStart.toISOString(),
        startDate: periodStart,
        endDate: periodEnd
      });
    }
  } else if (timeframe === '30days') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    
    for (let day = 0; day < 30; day++) {
      const periodStart = new Date(startDate);
      periodStart.setDate(startDate.getDate() + day);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 1);
      
      periods.push({
        period: periodStart.toISOString(),
        startDate: periodStart,
        endDate: periodEnd
      });
    }
  } else { // 1year
    startDate = new Date(now);
    startDate.setFullYear(now.getFullYear() - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    for (let month = 0; month < 12; month++) {
      const periodStart = new Date(startDate);
      periodStart.setMonth(startDate.getMonth() + month);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodStart.getMonth() + 1);
      
      periods.push({
        period: periodStart.toISOString(),
        startDate: periodStart,
        endDate: periodEnd
      });
    }
  }

  return periods.map(({ period, startDate, endDate }) => {
    const periodCompanies = companies?.filter(company => {
      const createdAt = new Date(company.created_at);
      return createdAt >= startDate && createdAt < endDate;
    }) || [];

    const periodAccreditations = accreditations?.filter(acc => {
      const issuedAt = new Date(acc.issued_date);
      return issuedAt >= startDate && issuedAt < endDate && acc.status === 'ACTIVE';
    }) || [];

    const dataProviders = periodCompanies.filter(c => c.category === 'Bank').length;
    const dataRecipients = periodCompanies.filter(c => c.category === 'FinTech').length;
    
    return {
      period,
      dataProviders,
      dataRecipients,
      accreditedDataRecipients: periodAccreditations.length,
      totalAccreditations: periodAccreditations.length
    };
  });
};

export function SystemOverviewWidget({ onToggle, isVisible = true, className }: SystemOverviewWidgetProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('30days');

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies/all'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: accreditationsData, isLoading: accreditationsLoading } = useQuery({
    queryKey: ['/api/accreditations/all'],
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = companiesLoading || accreditationsLoading;

  const getTimeframeLabel = (timeframe: TimeframeOption) => {
    switch (timeframe) {
      case '1day': return '24H';
      case '30days': return '30D';
      case '1year': return '1Y';
      default: return timeframe;
    }
  };

  const stats = calculatePersonaStats(companiesData || [], accreditationsData || [], selectedTimeframe);
  const chartData = generateTimeSeriesData(companiesData || [], accreditationsData || [], selectedTimeframe);

  return (
    <Widget
      title="System Overview"
      subtitle="Platform-wide enrollment and activity metrics"
      icon={<Building2 className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      className={`${className} h-full flex flex-col`}
      size="triple"
    >
      <div className="space-y-6 h-full flex flex-col">
        {/* Timeframe Controls */}
        <div className="flex justify-end gap-2">
          {(['1day', '30days', '1year'] as TimeframeOption[]).map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
              className="text-xs"
            >
              {getTimeframeLabel(timeframe)}
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700">Total Companies</p>
                <p className="text-lg font-bold text-purple-900">{stats.totalCompanies.toLocaleString()}</p>
              </div>
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700">Data Providers</p>
                <p className="text-lg font-bold text-green-900">{stats.dataProviders.toLocaleString()}</p>
              </div>
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">Data Recipients</p>
                <p className="text-lg font-bold text-blue-900">{stats.dataRecipients.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700">Accreditations</p>
                <p className="text-lg font-bold text-indigo-900">{stats.totalAccreditations.toLocaleString()}</p>
              </div>
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-grow min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading enrollment data...</span>
              </div>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }} maxBarSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
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
                    fontSize: '11px', 
                    paddingTop: '15px',
                    lineHeight: '20px',
                    fontWeight: 'bold'
                  }}
                  iconSize={10}
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <div className="flex justify-center items-center gap-8 pt-4">
                        {payload?.map((entry, index) => (
                          <div key={index} className="flex items-center">
                            <div 
                              className="w-2.5 h-2.5 mr-1.5" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs font-bold text-gray-700">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
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
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Building2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No enrollment data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}