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
  companyId?: number;
  showDropdown?: boolean;
}

export function RiskRadarChart({ className, companyId, showDropdown = true }: RiskRadarChartProps) {
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

  // Set the selected company ID once the current company is loaded or if a specific companyId is provided
  useEffect(() => {
    if (companyId) {
      setSelectedCompanyId(companyId);
    } else if (company && !selectedCompanyId) {
      setSelectedCompanyId(company.id);
    }
  }, [company, selectedCompanyId, companyId]);

  // Fetch network companies if the current company is a Bank or Invela
  const isBankOrInvela = company?.category === 'Bank' || company?.category === 'Invela';
  
  // Use a more specific return type to fix TypeScript errors
  interface CompanyNetworkResponse {
    companies: CompanyWithRiskClusters[];
  }
  
  const { data: networkCompaniesData, isLoading: isNetworkLoading } = useQuery<RelationshipData[], Error, CompanyNetworkResponse>({
    queryKey: ['/api/relationships', company?.id],
    select: (data) => {
      // Transform relationship data into CompanyWithRiskClusters format
      const transformedCompanies = data.map(relationship => ({
        id: relationship.relatedCompanyId,
        name: relationship.relatedCompanyName,
        category: relationship.relatedCompanyCategory || 'FinTech',
        risk_score: relationship.relatedCompanyRiskScore || 0,
        chosen_score: relationship.relatedCompanyChosenScore,
        risk_clusters: relationship.relatedCompanyRiskClusters
      } as CompanyWithRiskClusters));
      
      return { companies: transformedCompanies };
    },
    enabled: isBankOrInvela && !!company?.id,
  });
  
  // Extract the companies array from the response
  const networkCompanies = networkCompaniesData?.companies || [];

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

  // Configure ApexCharts options with enhanced styling
  const chartOptions = {
    chart: {
      toolbar: {
        show: false,
      },
      fontFamily: 'inherit',
      background: 'transparent',
      dropShadow: {
        enabled: true,
        blur: 3,
        opacity: 0.2
      }
    },
    colors: ['#4965EC'], // Matching brand primary color from network viz
    fill: {
      opacity: 0.3,
      type: 'gradient',
      gradient: {
        shade: 'dark',
        gradientToColors: ['#7B74A8'],
        shadeIntensity: 1,
        type: 'vertical',
        opacityFrom: 0.7,
        opacityTo: 0.3,
      }
    },
    stroke: {
      width: 3,
      curve: 'smooth',
      colors: ['#4965EC'],
      dashArray: 0,
    },
    markers: {
      size: 6,
      colors: ['#ffffff'],
      strokeColors: '#4965EC',
      strokeWidth: 3,
      hover: {
        size: 8,
      }
    },
    grid: {
      show: true,
      padding: {
        top: 10,
        bottom: 10
      }
    },
    yaxis: {
      show: true,
      max: 500,
      tickAmount: 5,
      labels: {
        style: {
          fontSize: '12px',
          fontWeight: 500,
          colors: ['#64748b']
        },
        formatter: (val: number) => Math.round(val).toString()
      }
    },
    xaxis: {
      categories: riskClusters ? Object.keys(riskClusters) : [],
      labels: {
        style: {
          fontSize: '13px',
          fontWeight: 600,
          colors: ['#1e293b', '#1e293b', '#1e293b', '#1e293b', '#1e293b', '#1e293b']
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '13px',
        fontWeight: 'bold',
        colors: ['#1e293b']
      },
      background: {
        enabled: true,
        borderRadius: 4,
        padding: 4,
        opacity: 0.9,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      offsetY: -5
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '13px'
      },
      y: {
        title: {
          formatter: () => 'Risk Score'
        },
        formatter: (val: number) => val.toString()
      },
      marker: {
        show: true
      },
      fixed: {
        enabled: false,
        position: 'topRight',
        offsetY: 0
      }
    },
    plotOptions: {
      radar: {
        size: 140,
        polygons: {
          strokeColors: '#e2e8f0',
          strokeWidth: 1,
          connectorColors: '#e2e8f0',
          fill: {
            colors: ['#f8fafc', '#ffffff']
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 380
          },
          plotOptions: {
            radar: {
              size: 120
            }
          }
        }
      },
      {
        breakpoint: 576,
        options: {
          chart: {
            height: 320
          },
          plotOptions: {
            radar: {
              size: 100
            }
          },
          markers: {
            size: 5
          }
        }
      }
    ]
  };

  // Prepare the series data with enhanced visual properties
  const series = [{
    name: 'Risk Score',
    data: riskClusters ? Object.values(riskClusters) : [],
    color: '#4965EC',
    lineWidth: 3
  }];

  // If we're still loading or don't have risk clusters data, show a skeleton
  if (isLoading || !riskClusters) {
    return (
      <Card className={cn("w-full shadow-md border border-slate-200", className)}>
        <CardHeader className="bg-slate-50 rounded-t-lg pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Shield className="h-5 w-5 text-primary" />
            S&P Business Data Access Risk Breakdown
          </CardTitle>
          <CardDescription className="text-slate-500">
            Detailed breakdown of risk factors for this company
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full shadow-md border border-slate-200", className)}>
      <CardHeader className="bg-slate-50 rounded-t-lg pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Shield className="h-5 w-5 text-primary" />
              S&P Business Data Access Risk Breakdown
            </CardTitle>
            <CardDescription className="text-slate-500">
              Detailed breakdown of risk factors for {displayCompany?.name || 'this company'}
            </CardDescription>
          </div>

          {/* Only show company selector for Bank or Invela users and when dropdown is enabled */}
          {showDropdown && isBankOrInvela && networkCompanies && networkCompanies.length > 0 && (
            <div className="min-w-[220px]">
              <Select 
                value={selectedCompanyId?.toString()} 
                onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={company?.id?.toString() || "0"}>{company?.name || "Your Company"} (You)</SelectItem>
                  {Array.isArray(networkCompanies) && networkCompanies
                    .filter(c => c.id !== (company?.id || 0))
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
      <CardContent className="p-6">
        <div className="h-[450px] w-full bg-white rounded-md">
          {chartComponentLoaded && ReactApexChart && (
            <ReactApexChart 
              options={chartOptions} 
              series={series} 
              type="radar" 
              height="450"
            />
          )}
          {!chartComponentLoaded && (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="h-[450px] w-full rounded-md" />
            </div>
          )}
        </div>
        
        {/* Add risk category legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {riskClusters && Object.entries(riskClusters).map(([category, value], index) => (
            <div key={category} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary opacity-80"></div>
              <span className="text-sm font-medium text-slate-700">{category}: {value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}