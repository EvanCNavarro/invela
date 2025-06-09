import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentCompany } from '@/hooks/use-current-company';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Define the risk cluster data type
interface RiskClusters {
  'Cyber Security': number;
  'Financial Stability': number;
  'Potential Liability': number;
  'Dark Web Data': number;
  'Public Sentiment': number;
  'Data Access Scope': number;
}

// Company type
interface CompanyWithRiskClusters {
  id: number;
  name: string;
  category: string;
  risk_score: number;
  riskScore?: number;
  chosen_score?: number;
  risk_clusters?: RiskClusters;
  isDemo?: boolean;
  status?: string;
  accreditationStatus?: string;
  accreditation_status?: string;
  description?: string;
  relatedCompany?: {
    id: number;
    name: string;
    category: string;
    logoId: number | null;
    accreditationStatus: string;
    riskScore: number | null;
    isDemo: boolean;
  };
}

interface RiskRadarRechartsProps {
  className?: string;
  companyId?: number;
  showDropdown?: boolean;
}

function RiskRadarRechartsInternal({ className, companyId, showDropdown = true }: RiskRadarRechartsProps) {
  const { company, isLoading: isCompanyLoading } = useCurrentCompany();
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
  const isFintech = company?.category === 'FinTech';

  // Get companies data
  const { data: allCompaniesData = [], isLoading: isAllCompaniesLoading } = useQuery<CompanyWithRiskClusters[]>({
    queryKey: ['/api/companies-with-risk'],
    queryFn: async () => {
      const response = await fetch('/api/companies-with-risk');
      if (!response.ok) {
        throw new Error('Failed to fetch companies with risk data');
      }
      return response.json();
    },
    enabled: isBankOrInvela && !!company?.id,
    staleTime: 0,
    gcTime: 0
  });

  // Find the selected company and its risk clusters
  const displayCompany = allCompaniesData.find(c => c.id === selectedCompanyId) || company;
  const riskClusters = displayCompany?.risk_clusters as RiskClusters | undefined;

  // Transform risk clusters data for Recharts
  const chartData = React.useMemo(() => {
    if (!riskClusters) return [];
    
    return Object.entries(riskClusters).map(([key, value]) => ({
      category: formatCategoryName(key),
      value: value,
      fullMark: 100
    }));
  }, [riskClusters]);

  // Format category names for display
  const formatCategoryName = (category: string): string => {
    const uppercaseCategory = category.toUpperCase();
    
    if (uppercaseCategory.includes("CYBER SECURITY")) return "CYBER SECURITY";
    if (uppercaseCategory.includes("FINANCIAL STABILITY")) return "FINANCIAL STABILITY";
    if (uppercaseCategory.includes("POTENTIAL LIABILITY")) return "POTENTIAL LIABILITY";
    if (uppercaseCategory.includes("DARK WEB DATA")) return "DARK WEB DATA";
    if (uppercaseCategory.includes("PUBLIC SENTIMENT")) return "PUBLIC SENTIMENT";
    if (uppercaseCategory.includes("DATA ACCESS SCOPE")) return "DATA ACCESS SCOPE";
    
    return uppercaseCategory;
  };

  // Get filtered companies for dropdown
  const filteredCompanies = React.useMemo(() => {
    return allCompaniesData.filter(company => {
      const hasRiskClusters = company.risk_clusters && Object.keys(company.risk_clusters).length > 0;
      const isApproved = company.accreditationStatus === 'APPROVED' || company.accreditation_status === 'APPROVED';
      return hasRiskClusters && isApproved;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCompaniesData]);

  const isLoading = isCompanyLoading || isAllCompaniesLoading;

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Risk Radar</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Multi-dimensional risk assessment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[280px]">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayCompany || !riskClusters) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Risk Radar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[280px]">
            <div className="text-center text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No risk data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Risk Radar</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Multi-dimensional risk assessment
            </CardDescription>
          </div>
          {showDropdown && isBankOrInvela && filteredCompanies.length > 0 && (
            <Select
              value={selectedCompanyId?.toString()}
              onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
            >
              <SelectTrigger className="w-48 bg-white border border-gray-200 shadow-sm hover:bg-gray-50">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                {filteredCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()} className="bg-white hover:bg-gray-50">
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid 
              stroke="#e2e8f0" 
              strokeWidth={1}
            />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ 
                fontSize: 10, 
                fontWeight: 700, 
                fill: '#1e293b' 
              }}
              className="text-xs font-bold"
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ 
                fontSize: 10, 
                fill: '#64748b' 
              }}
              tickCount={6}
            />
            <Radar
              name="Risk Score"
              dataKey="value"
              stroke="#4965EC"
              fill="#4965EC"
              fillOpacity={0.3}
              strokeWidth={3}
              dot={{ 
                fill: '#ffffff', 
                stroke: '#4965EC', 
                strokeWidth: 2, 
                r: 4 
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RiskRadarRecharts({ className, companyId, showDropdown }: RiskRadarRechartsProps) {
  return (
    <RiskRadarRechartsInternal
      className={className}
      companyId={companyId}
      showDropdown={showDropdown}
    />
  );
}