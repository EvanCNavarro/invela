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

  // Format category names to add line breaks and ensure concise display
  const formatCategoryNames = (categories: string[]): string[] => {
    return categories.map(category => {
      if (!category) return '';

      // Use shorter labels for specific categories
      if (category === 'PII Data') return 'PII\nData';
      if (category === 'Account Data') return 'Account\nData';
      if (category === 'Data Transfers') return 'Data\nTransfers';
      if (category === 'Certifications Risk') return 'Cert.\nRisk';
      if (category === 'Security Risk') return 'Security\nRisk';
      if (category === 'Financial Risk') return 'Financial\nRisk';
      
      // Default formatting for other categories
      const words = category.split(' ');
      if (words.length <= 1) return category;
      
      // Return with each word on its own line
      return words.map(word => word.trim()).join('\n');
    });
  };

  // Configure ApexCharts options based exactly on the reference image
  const chartOptions = {
    chart: {
      toolbar: {
        show: false,
      },
      fontFamily: 'inherit',
      background: 'transparent',
      dropShadow: {
        enabled: false, // No drop shadow in reference
      },
      parentHeightOffset: 0,
      sparkline: {
        enabled: false
      }
    },
    colors: ['#4965EC'], // Primary blue color matching reference
    fill: {
      opacity: 0.2, // Light blue fill as in reference
      colors: ['#4965EC'], 
    },
    stroke: {
      width: 3, // Thicker border line as in reference
      curve: 'straight', // Straight lines, not curved
      colors: ['#4965EC'],
      dashArray: 0,
    },
    markers: {
      size: 8, // Large blue dots at vertices
      colors: ['#4965EC'], // Blue marker dots
      strokeWidth: 0, // No border on markers
      hover: {
        size: 10
      }
    },
    grid: {
      show: true,
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    yaxis: {
      show: true,
      max: 500, // Max value in reference is 500
      tickAmount: 5, // 5 concentric circles (100-500)
      min: 0, // Start from 0
      labels: {
        style: {
          fontSize: '12px',
          fontWeight: 500,
          colors: ['#64748b']
        },
        formatter: (val: number) => Math.round(val).toString(),
        show: true,
      }
    },
    xaxis: {
      // Use exact categories as in reference image
      categories: [
        'FINANCIAL\nRISK', 
        'SECURITY\nRISK', 
        'CERTIFICATIONS\nRISK', 
        'DATA\nTRANSFERS', 
        'ACCOUNT\nDATA', 
        'PII DATA'
      ],
      labels: {
        style: {
          fontSize: '11px',
          fontWeight: 700, // Bold text as in reference
          colors: Array(6).fill('#000000') // Black text in reference
        },
        rotate: 0,
        offsetY: 5,
        background: {
          enabled: false, // No background in reference
        }
      }
    },
    dataLabels: {
      enabled: false, // No data labels in reference
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '14px'
      },
      y: {
        title: {
          formatter: () => 'Risk Score'
        },
        formatter: (val: number) => val.toString()
      },
      marker: {
        show: true
      }
    },
    plotOptions: {
      radar: {
        size: '80%', // Slightly smaller to ensure spacing
        offsetY: 0,
        offsetX: 0,
        polygons: {
          strokeColors: '#d1d5db', // Light gray grid lines
          strokeWidth: 1,
          strokeDashArray: 4, // Dashed lines as in reference
          connectorColors: '#d1d5db', // Same color for connector lines
          fill: {
            colors: undefined // No alternating background color
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          plotOptions: {
            radar: {
              size: '80%'
            }
          }
        }
      },
      {
        breakpoint: 992,
        options: {
          plotOptions: {
            radar: {
              size: '75%'
            }
          },
          markers: {
            size: 5
          }
        }
      },
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
          },
          dataLabels: {
            enabled: false // Turn off data labels on smaller screens
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '10px'
              }
            }
          }
        }
      },
      {
        breakpoint: 576,
        options: {
          plotOptions: {
            radar: {
              size: '65%'
            }
          },
          markers: {
            size: 3
          },
          yaxis: {
            labels: {
              style: {
                fontSize: '8px'
              }
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '9px'
              }
            }
          }
        }
      }
    ]
  };

  // Prepare the series data exactly as in the reference image
  const series = [{
    name: 'Risk Score',
    // If we have real data use it, otherwise use demo data that matches the reference image
    data: riskClusters ? Object.values(riskClusters) : [280, 380, 180, 420, 320, 180],
    color: '#4965EC', // Primary blue color
    fillColor: '#D0E1FF', // Light blue fill
    opacity: 0.2, // Light opacity as in reference
  }];

  // If we're still loading or don't have risk clusters data, show a skeleton
  if (isLoading || !riskClusters) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className={className ? "bg-transparent" : "bg-slate-50 rounded-t-lg pb-3"}>
          <CardTitle className="text-slate-800">
            S&P Business Data Access Risk Breakdown
          </CardTitle>
          <CardDescription className="text-slate-500">
            Detailed breakdown of risk factors for this company
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-0">
          <div className="w-full h-full mx-auto">
            <Skeleton className="w-full h-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full rounded-xl bg-white p-4", className)}>
      {/* Header that matches the reference exactly */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Analysis</h3>
            <p className="text-sm text-gray-500">Vendor risk across six key metrics.</p>
          </div>
        </div>
        
        {/* Three dots menu */}
        <div className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </div>
      </div>

      {/* Only show company selector if dropdown is enabled and we have network companies */}
      {showDropdown && isBankOrInvela && networkCompanies && networkCompanies.length > 0 && (
        <div className="mb-4">
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
                .filter(c => c.id !== (company?.id || 0) && c.category !== 'FinTech')
                .map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="w-full h-[400px] flex items-center justify-center">
        {chartComponentLoaded && ReactApexChart ? (
          <ReactApexChart 
            options={{
              ...chartOptions,
              chart: {
                ...chartOptions.chart,
                height: "100%",
                width: "100%",
                redrawOnWindowResize: true,
                redrawOnParentResize: true,
                offsetX: 0, // Center the chart
                parentHeightOffset: 0 // Ensure full height is used
              }
            }} 
            series={series} 
            type="radar" 
            height="100%"
            width="100%"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-md" />
          </div>
        )}
      </div>
      
      {/* Small company badge in the top-left as in reference image */}
      <div className="absolute top-20 left-12 z-10">
        <div className="flex items-center gap-1 bg-white border border-blue-100 rounded-md py-1 px-2 text-xs font-semibold text-blue-900">
          <span className="w-2 h-2 bg-blue-900 rounded-sm"></span>
          <span>COMPANY<br/>ACCREDITATION<br/>SCORE</span>
        </div>
      </div>
    </Card>
  );
}