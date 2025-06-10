import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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

// Import ApexCharts dynamically
let ReactApexChart: any = null;

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

interface RiskRadarApexImprovedProps {
  className?: string;
  companyId?: number;
  showDropdown?: boolean;
}

function RiskRadarApexImprovedInternal({ className, companyId, showDropdown = true }: RiskRadarApexImprovedProps) {
  const { company, isLoading: isCompanyLoading } = useCurrentCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);

  // Load ApexCharts components only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[RiskRadarApexImproved] Loading ApexCharts component...');
      import('react-apexcharts').then((mod) => {
        console.log('[RiskRadarApexImproved] ApexCharts loaded successfully');
        ReactApexChart = mod.default;
        setChartComponentLoaded(true);
      }).catch(err => {
        console.error('[RiskRadarApexImproved] Error loading ApexCharts:', err);
      });
    }
  }, []);

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

  // Find the selected company and its risk clusters with proper fallback logic
  const displayCompany = React.useMemo(() => {
    if (selectedCompanyId) {
      return allCompaniesData.find(c => c.id === selectedCompanyId) || company;
    }
    return company;
  }, [allCompaniesData, selectedCompanyId, company]);

  // Extract risk clusters with multiple fallback patterns
  const riskClusters = React.useMemo(() => {
    if (!displayCompany) return null;
    
    // Try multiple data source patterns
    const clusters = displayCompany.risk_clusters || 
                    (displayCompany as any).riskClusters || 
                    displayCompany.relatedCompany?.riskClusters;
    
    return clusters as RiskClusters | undefined;
  }, [displayCompany]);

  // Format category names for display
  const formatCategoryNames = (categories: string[]): string[] => {
    return categories.map((category) => {
      if (!category) return '';
      
      const uppercaseCategory = category.toUpperCase();
      
      if (uppercaseCategory.includes("CYBER SECURITY")) return "CYBER SECURITY";
      if (uppercaseCategory.includes("FINANCIAL STABILITY")) return "FINANCIAL STABILITY";
      if (uppercaseCategory.includes("POTENTIAL LIABILITY")) return "POTENTIAL LIABILITY";
      if (uppercaseCategory.includes("DARK WEB DATA")) return "DARK WEB DATA";
      if (uppercaseCategory.includes("PUBLIC SENTIMENT")) return "PUBLIC SENTIMENT";
      if (uppercaseCategory.includes("DATA ACCESS SCOPE")) return "DATA ACCESS SCOPE";
      
      return uppercaseCategory;
    });
  };

  // Improved ApexCharts configuration
  const chartOptions = {
    chart: {
      type: 'radar',
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        }
      }
    },
    colors: ['#4965EC'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'radial',
        shadeIntensity: 0.1,
        gradientToColors: ['#7B74A8'],
        inverseColors: false,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 50, 100]
      }
    },
    stroke: {
      width: 2,
      colors: ['#4965EC']
    },
    markers: {
      size: 6,
      colors: ['#ffffff'],
      strokeColors: '#4965EC',
      strokeWidth: 2,
      hover: {
        size: 8
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
            colors: ['#f8fafc', '#f1f5f9']
          }
        }
      }
    },
    grid: {
      show: true,
      padding: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 20
      }
    },
    xaxis: {
      categories: riskClusters ? formatCategoryNames(Object.keys(riskClusters)) : [],
      labels: {
        style: {
          fontSize: '10px',
          fontWeight: 600,
          colors: '#1e293b'
        }
      }
    },
    yaxis: {
      show: true,
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        show: true,
        style: {
          fontSize: '10px',
          colors: '#64748b',
          fontWeight: 500
        },
        formatter: (val: number) => {
          return Math.round(val).toString();
        }
      }
    },
    dataLabels: {
      enabled: true,
      background: {
        enabled: true,
        foreColor: '#1e293b',
        borderRadius: 2,
        padding: 2,
        opacity: 0.9,
        borderWidth: 1,
        borderColor: '#e2e8f0'
      },
      style: {
        fontSize: '10px',
        fontWeight: 'bold'
      }
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: (val: number) => val.toString()
      }
    },
    grid: {
      show: false
    },
    legend: {
      show: false
    }
  };

  // Prepare the series data
  const series = [{
    name: 'Risk Score',
    data: riskClusters ? Object.values(riskClusters) : []
  }];

  // Get filtered companies for dropdown
  const filteredCompanies = React.useMemo(() => {
    return allCompaniesData.filter(company => {
      const hasRiskClusters = company.risk_clusters && Object.keys(company.risk_clusters).length > 0;
      const isApproved = company.accreditationStatus === 'APPROVED' || company.accreditation_status === 'APPROVED';
      return hasRiskClusters && isApproved;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCompaniesData]);

  const isLoading = isCompanyLoading || isAllCompaniesLoading || !chartComponentLoaded;

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Risk Radar (ApexCharts Improved)</CardTitle>
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

  if (!displayCompany || !riskClusters || Object.keys(riskClusters).length === 0 || !ReactApexChart) {
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
              Complete your INVELA trust network accreditation to receive your risk assessment.
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
          {showDropdown && isBankOrInvela && filteredCompanies.length > 0 && (
            <Select
              value={selectedCompanyId?.toString()}
              onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
            >
              <SelectTrigger className="w-80 bg-white border border-gray-200 shadow-sm hover:bg-gray-50">
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
        <div className="w-full h-[350px] flex justify-center items-center">
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="radar"
            height="320"
            width="100%"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskRadarApexImproved({ className, companyId, showDropdown }: RiskRadarApexImprovedProps) {
  return (
    <RiskRadarApexImprovedInternal
      className={className}
      companyId={companyId}
      showDropdown={showDropdown}
    />
  );
}