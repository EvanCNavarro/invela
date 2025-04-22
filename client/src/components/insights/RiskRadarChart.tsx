import React from 'react';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useCurrentCompany, type Company } from '@/hooks/use-current-company';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { Shield } from 'lucide-react';

// Import these dynamically to prevent SSR issues
let ReactApexChart: any = null;

// Define the risk cluster data type
interface RiskClusters {
  'PII Data': number;
  'Account Data': number;
  'Data Transfers': number;
  'Certifications Risk': number;
  'Security Risk': number;
  'Financial Risk': number;
}

// Define the company type to extend the existing Company type from hooks
interface CompanyWithRiskClusters {
  id: number;
  name: string;
  category: string;
  risk_score: number;
  chosen_score?: number;
  risk_clusters?: RiskClusters;
  isDemo?: boolean;
  status?: string;
  description?: string;
}

// Define relationship type for network companies
interface RelationshipData {
  id: number;
  companyId: number;
  relatedCompanyId: number;
  relatedCompanyName: string;
  relatedCompanyCategory?: string;
  relatedCompanyRiskScore?: number;
  relatedCompanyChosenScore?: number;
  relatedCompanyRiskClusters?: RiskClusters;
  relationshipType: string;
}

interface RiskRadarChartProps {
  className?: string;
}

export function RiskRadarChart({ className }: RiskRadarChartProps) {
  const { company, isLoading: isCompanyLoading } = useCurrentCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);
  const queryClient = useQueryClient();

  // Load ApexCharts components only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-apexcharts').then((mod) => {
        ReactApexChart = mod.default;
        setChartComponentLoaded(true);
      }).catch(err => {
        console.error("Error loading ApexCharts:", err);
      });
    }
  }, []);

  // Set the selected company ID once the current company is loaded
  useEffect(() => {
    if (company && !selectedCompanyId) {
      setSelectedCompanyId(company.id);
    }
  }, [company, selectedCompanyId]);

  // Fetch network companies if the current company is a Bank or Invela
  const isBankOrInvela = company?.category === 'Bank' || company?.category === 'Invela';
  const { data: networkCompanies, isLoading: isNetworkLoading } = useQuery<RelationshipData[]>({
    queryKey: ['/api/relationships', company?.id],
    select: (data) => {
      // Transform relationship data into CompanyWithRiskClusters format
      return data?.map(relationship => ({
        id: relationship.relatedCompanyId,
        name: relationship.relatedCompanyName,
        category: relationship.relatedCompanyCategory || 'FinTech',
        risk_score: relationship.relatedCompanyRiskScore || 0,
        chosen_score: relationship.relatedCompanyChosenScore,
        risk_clusters: relationship.relatedCompanyRiskClusters
      } as CompanyWithRiskClusters)) || [];
    },
    enabled: isBankOrInvela && !!company?.id,
  });

  // Fetch selected company data
  const { data: selectedCompany, isLoading: isSelectedCompanyLoading } = useQuery<CompanyWithRiskClusters>({
    queryKey: ['/api/companies', selectedCompanyId],
    enabled: !!selectedCompanyId && selectedCompanyId !== company?.id,
  });

  // Determine the company data to display
  const displayCompany = selectedCompanyId === company?.id ? company : selectedCompany;
  const isLoading = isCompanyLoading || (isSelectedCompanyLoading && selectedCompanyId !== company?.id);

  // Extract risk clusters data - ensuring we handle both Company and CompanyWithRiskClusters types
  const riskClusters = displayCompany ? 
    ('risk_clusters' in displayCompany ? displayCompany.risk_clusters : undefined) : 
    undefined;

  // Configure ApexCharts options
  const chartOptions = {
    chart: {
      toolbar: {
        show: false,
      },
      fontFamily: 'inherit',
    },
    colors: ['#4263EB'],
    fill: {
      opacity: 0.2,
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    markers: {
      size: 5,
      hover: {
        size: 7,
      }
    },
    yaxis: {
      show: true,
      max: 500,
      tickAmount: 5,
    },
    xaxis: {
      categories: riskClusters ? Object.keys(riskClusters) : [],
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      y: {
        formatter: (val: number) => val.toString()
      }
    },
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: '#e9e9e9',
          fill: {
            colors: ['#f8f8f8', '#fff']
          }
        }
      }
    }
  };

  // Prepare the series data
  const series = [{
    name: 'Risk Score',
    data: riskClusters ? Object.values(riskClusters) : [],
  }];

  // If we're still loading or don't have risk clusters data, show a skeleton
  if (isLoading || !riskClusters) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            S&P Business Data Access Risk Breakdown
          </CardTitle>
          <CardDescription>
            Detailed breakdown of risk factors for this company
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              S&P Business Data Access Risk Breakdown
            </CardTitle>
            <CardDescription>
              Detailed breakdown of risk factors for {displayCompany?.name || 'this company'}
            </CardDescription>
          </div>

          {/* Only show company selector for Bank or Invela users */}
          {isBankOrInvela && networkCompanies && (
            <div className="min-w-[200px]">
              <Select 
                value={selectedCompanyId?.toString()} 
                onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={company.id.toString()}>{company.name} (You)</SelectItem>
                  {networkCompanies
                    .filter(c => c.id !== company.id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          {chartComponentLoaded && ReactApexChart && (
            <ReactApexChart 
              options={chartOptions} 
              series={series} 
              type="radar" 
              height="400"
            />
          )}
          {!chartComponentLoaded && (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="h-[400px] w-full rounded-md" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}