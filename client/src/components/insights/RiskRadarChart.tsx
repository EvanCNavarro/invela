import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
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
import { MoreVertical } from 'lucide-react';

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

// Define the company type
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
    if (companyId) {
      setSelectedCompanyId(companyId);
    } else if (company && !selectedCompanyId) {
      setSelectedCompanyId(company.id);
    }
  }, [company, selectedCompanyId, companyId]);

  // Fetch network companies if the current company is a Bank or Invela
  const isBankOrInvela = company?.category === 'Bank' || company?.category === 'Invela';
  
  interface CompanyNetworkResponse {
    companies: CompanyWithRiskClusters[];
  }
  
  const { data: networkCompaniesData } = useQuery<RelationshipData[], Error, CompanyNetworkResponse>({
    queryKey: ['/api/relationships', company?.id],
    select: (data) => {
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
  
  const networkCompanies = networkCompaniesData?.companies || [];

  // Fetch selected company data
  const { data: selectedCompany, isLoading: isSelectedCompanyLoading } = useQuery<CompanyWithRiskClusters>({
    queryKey: ['/api/companies', selectedCompanyId],
    enabled: !!selectedCompanyId && selectedCompanyId !== company?.id,
  });

  // Determine the company data to display
  const displayCompany = selectedCompanyId === company?.id ? company : selectedCompany;
  const isLoading = isCompanyLoading || (isSelectedCompanyLoading && selectedCompanyId !== company?.id);

  // Extract risk clusters data
  const riskClusters = displayCompany ? 
    ('risk_clusters' in displayCompany ? displayCompany.risk_clusters : undefined) : 
    undefined;

  // Demo data exactly matching the reference image
  const demoData = [280, 380, 180, 420, 320, 180];

  // Configure ApexCharts options based on the reference image
  const chartOptions = {
    chart: {
      toolbar: {
        show: false,
      },
      fontFamily: 'inherit',
      background: 'transparent',
      dropShadow: {
        enabled: false,
      },
    },
    colors: ['#4965EC'],
    fill: {
      opacity: 0.2,
      colors: ['#4965EC']
    },
    stroke: {
      width: 2,
      colors: ['#4965EC'],
    },
    markers: {
      size: 6,
      colors: ['#4965EC'],
      strokeWidth: 0,
    },
    grid: {
      show: false,
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    yaxis: {
      max: 500,
      min: 0,
      tickAmount: 5,
      labels: {
        show: true,
        style: {
          fontSize: '12px',
          fontWeight: 400,
          colors: ['#64748b']
        },
        formatter: (val: number) => val.toString()
      }
    },
    xaxis: {
      categories: [
        'FINANCIAL\nRISK', 
        'SECURITY\nRISK', 
        'CERTIFICATIONS\nRISK', 
        'DATA\nTRANSFERS', 
        'ACCOUNT\nDATA', 
        'PII DATA'
      ],
      labels: {
        show: true,
        style: {
          fontSize: '10px',
          fontWeight: 700,
          colors: Array(6).fill('#000000')
        },
        formatter: (value: string) => {
          return value.split('\n').map(line => 
            `<div style="text-align:center">${line}</div>`
          ).join('');
        }
      }
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      theme: 'light',
      y: {
        title: {
          formatter: () => 'Risk Score'
        }
      }
    },
    plotOptions: {
      radar: {
        size: '75%',
        polygons: {
          strokeColors: '#d1d5db',
          strokeWidth: 1,
          strokeDashArray: 5,
          connectorColors: '#d1d5db',
          fill: {
            colors: undefined
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          plotOptions: {
            radar: {
              size: '70%'
            }
          },
          markers: {
            size: 4
          }
        }
      }
    ]
  };

  // Series data that matches the reference image
  const series = [{
    name: 'Risk Score',
    data: riskClusters ? Object.values(riskClusters) : demoData
  }];

  // If still loading, show a skeleton
  if (isLoading && !chartComponentLoaded) {
    return (
      <Card className={cn("w-full h-[400px]", className)}>
        <div className="w-full h-full flex items-center justify-center">
          <Skeleton className="w-[80%] h-[80%] rounded-md" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full relative bg-white p-5", className)}>
      {/* Title section */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium leading-none">Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1">Vendor risk across six key metrics.</p>
          </div>
        </div>
        <MoreVertical className="h-5 w-5 text-gray-400" />
      </div>

      {/* Company selector - only shown for Bank/Invela if needed */}
      {showDropdown && isBankOrInvela && networkCompanies && networkCompanies.length > 0 && (
        <div className="mb-4">
          <Select 
            value={selectedCompanyId?.toString()} 
            onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
          >
            <SelectTrigger className="bg-white border-gray-200 h-9">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={company?.id?.toString() || "0"}>
                {company?.name || "Your Company"} (You)
              </SelectItem>
              {networkCompanies
                .filter(c => c.id !== (company?.id || 0) && c.category !== 'FinTech')
                .map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Radar Chart with accreditation badge overlay */}
      <div className="relative">
        {/* Accreditation score box - positioned absolutely on top of the chart */}
        <div className="absolute left-5 top-5 z-10">
          <div className="bg-white border border-blue-100 rounded px-2 py-1 text-[10px] font-bold text-blue-900 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-900 rounded-sm"></div>
            <div className="flex flex-col leading-tight">
              <span>COMPANY</span>
              <span>ACCREDITATION</span>
              <span>SCORE</span>
            </div>
          </div>
        </div>

        {/* Chart container */}
        <div className="w-full h-[350px]">
          {chartComponentLoaded && ReactApexChart ? (
            <ReactApexChart 
              options={chartOptions}
              series={series}
              type="radar"
              height="100%"
              width="100%"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="w-[80%] h-[80%] rounded-md" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}