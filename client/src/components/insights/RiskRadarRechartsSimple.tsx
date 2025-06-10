import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCurrentCompany } from '@/hooks/use-current-company';

interface RiskClusters {
  'Cyber Security': number;
  'Financial Stability': number;
  'Potential Liability': number;
  'Dark Web Data': number;
  'Public Sentiment': number;
  'Data Access Scope': number;
}

interface CompanyWithRiskClusters {
  id: number;
  name: string;
  category: string;
  risk_score: number;
  risk_clusters?: RiskClusters;
}

interface RiskRadarRechartsSimpleProps {
  className?: string;
  companyId?: number;
  showDropdown?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg border">
        <p className="font-semibold">{label}</p>
        <p className="text-blue-300">{`Score: ${data.value}/100`}</p>
      </div>
    );
  }
  return null;
};

export function RiskRadarRechartsSimple({ 
  className, 
  companyId,
  showDropdown = true
}: RiskRadarRechartsSimpleProps) {
  const { company } = useCurrentCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Set the selected company ID
  useEffect(() => {
    if (companyId) {
      setSelectedCompanyId(companyId);
    } else if (company && !selectedCompanyId) {
      setSelectedCompanyId(company.id);
    }
  }, [company, selectedCompanyId, companyId]);

  // Company type checks
  const isBankOrInvela = company?.category === 'Bank' || company?.category === 'Invela';

  // Get companies data for dropdown
  const { data: allCompaniesData = [] } = useQuery<CompanyWithRiskClusters[]>({
    queryKey: ['/api/companies-with-risk'],
    queryFn: async () => {
      const response = await fetch('/api/companies-with-risk');
      if (!response.ok) {
        throw new Error('Failed to fetch companies with risk data');
      }
      return response.json();
    },
    enabled: showDropdown && isBankOrInvela && !!company?.id,
    staleTime: 30000,
    gcTime: 300000
  });

  // Find the selected company
  const displayCompany = React.useMemo(() => {
    if (selectedCompanyId) {
      const foundCompany = allCompaniesData.find(c => c.id === selectedCompanyId);
      if (foundCompany) return foundCompany;
    }
    
    // Fallback to current company or BankingAPI Gateway
    if (company) return company;
    return allCompaniesData.find(c => c.id === 459) || allCompaniesData[0];
  }, [selectedCompanyId, allCompaniesData, company]);

  // Transform risk clusters to chart data
  const chartData = React.useMemo(() => {
    const companyWithClusters = displayCompany as CompanyWithRiskClusters;
    if (!companyWithClusters?.risk_clusters) {
      return null;
    }

    return Object.entries(companyWithClusters.risk_clusters).map(([category, value]) => ({
      category,
      value: Number(value) || 0,
      fullMark: 100
    }));
  }, [displayCompany]);

  // Filter companies with risk clusters for dropdown
  const companiesWithClusters = React.useMemo(() => {
    return allCompaniesData.filter(company => 
      company.risk_clusters && 
      Object.keys(company.risk_clusters).length > 0
    );
  }, [allCompaniesData]);

  if (!chartData) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 max-w-sm mx-auto">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-2">Risk Analysis Not Found</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Complete your Invela Trust Network Accreditation, to receive your company risk assessment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center">
          {showDropdown && companiesWithClusters.length > 1 && (
            <Select 
              value={selectedCompanyId?.toString() || ''} 
              onValueChange={(value) => setSelectedCompanyId(Number(value))}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companiesWithClusters.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: '600' }}
                className="text-xs"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 10]} 
                tick={{ fontSize: 8, fill: '#94a3b8' }}
                tickCount={6}
              />
              <Radar
                name="Risk Score"
                dataKey="value"
                stroke="#4965EC"
                fill="#4965EC"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ fill: '#4965EC', strokeWidth: 2, stroke: '#fff', r: 4 }}
                activeDot={{ r: 6, fill: '#4965EC', stroke: '#fff', strokeWidth: 2 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {displayCompany && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Risk Score:</span>
                <span className="ml-2 text-blue-600">{displayCompany.risk_score}/100</span>
              </div>
              <div>
                <span className="font-medium">Category:</span>
                <span className="ml-2">{displayCompany.category}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}