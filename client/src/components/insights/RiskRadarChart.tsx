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

  // Format category names to add line breaks with exactly one word per line
  const formatCategoryNames = (categories: string[]): string[] => {
    return categories.map(category => {
      if (!category) return '';
      // Split by spaces and join with line breaks
      const words = category.split(' ');
      if (words.length <= 1) return category;
      
      // Return with each word on its own line
      return words.map(word => word.trim()).join('\n');
    });
  };

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
      },
      redrawOnWindowResize: true, // Important for sizing responsiveness
      redrawOnParentResize: true, // Ensure chart redraws when parent container resizes
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 500,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
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
      size: className?.includes("border-none") ? 5 : 7, // Smaller markers for compact view
      colors: ['#ffffff'],
      strokeColors: '#4965EC',
      strokeWidth: className?.includes("border-none") ? 2 : 3,
      hover: {
        size: className?.includes("border-none") ? 7 : 9, // Smaller hover for compact view
      }
    },
    grid: {
      show: false, // Removed horizontal lines in the background
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    yaxis: {
      show: true,
      max: 500,
      tickAmount: 5,
      labels: {
        style: {
          fontSize: '10px',
          fontWeight: 500,
          colors: ['#64748b']
        },
        formatter: (val: number) => Math.round(val).toString()
      }
    },
    xaxis: {
      categories: riskClusters ? formatCategoryNames(Object.keys(riskClusters)) : [],
      labels: {
        style: {
          fontSize: className?.includes("border-none") ? '10px' : '12px',
          fontWeight: 600,
          colors: ['#1e293b', '#1e293b', '#1e293b', '#1e293b', '#1e293b', '#1e293b']
        },
        rotate: 0,
        offsetY: className?.includes("border-none") ? 1 : 3
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: className?.includes("border-none") ? '10px' : '12px',
        fontWeight: 'bold',
        colors: ['#1e293b']
      },
      background: {
        enabled: true,
        borderRadius: 3,
        padding: className?.includes("border-none") ? 2 : 3,
        opacity: 0.9,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      offsetY: className?.includes("border-none") ? -2 : -4
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
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
        size: className?.includes("border-none") ? 120 : 200, // Smaller radar for widget view
        offsetY: className?.includes("border-none") ? 0 : -20, // No offset for widget version
        offsetX: 0,
        polygons: {
          strokeColors: '#e2e8f0',
          strokeWidth: 1,
          connectorColors: '#e2e8f0',
          fill: {
            colors: ['transparent', 'transparent'] // Transparent background
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 1920, // Large desktops
        options: {
          chart: {
            height: className?.includes("border-none") ? 280 : 500
          },
          plotOptions: {
            radar: {
              size: className?.includes("border-none") ? 220 : 300,
              offsetY: className?.includes("border-none") ? 5 : -20
            }
          }
        }
      },
      {
        breakpoint: 1366, // Medium desktops
        options: {
          chart: {
            height: className?.includes("border-none") ? 270 : 480
          },
          plotOptions: {
            radar: {
              size: className?.includes("border-none") ? 190 : 260,
              offsetY: className?.includes("border-none") ? 5 : -20
            }
          }
        }
      },
      {
        breakpoint: 1200, // Small desktops
        options: {
          chart: {
            height: className?.includes("border-none") ? 260 : 450
          },
          plotOptions: {
            radar: {
              size: className?.includes("border-none") ? 160 : 220,
              offsetY: className?.includes("border-none") ? 0 : -15
            }
          }
        }
      },
      {
        breakpoint: 992, // Tablets
        options: {
          chart: {
            height: className?.includes("border-none") ? 250 : 420
          },
          plotOptions: {
            radar: {
              size: className?.includes("border-none") ? 140 : 200,
              offsetY: className?.includes("border-none") ? 0 : -15
            }
          },
          markers: {
            size: className?.includes("border-none") ? 4 : 6
          }
        }
      },
      {
        breakpoint: 768, // Large phones
        options: {
          chart: {
            height: className?.includes("border-none") ? 240 : 400
          },
          plotOptions: {
            radar: {
              size: className?.includes("border-none") ? 130 : 180,
              offsetY: className?.includes("border-none") ? 0 : -10
            }
          },
          markers: {
            size: className?.includes("border-none") ? 4 : 5
          }
        }
      },
      {
        breakpoint: 576, // Small phones
        options: {
          chart: {
            height: className?.includes("border-none") ? 230 : 380
          },
          plotOptions: {
            radar: {
              size: className?.includes("border-none") ? 120 : 150,
              offsetY: className?.includes("border-none") ? 0 : -5
            }
          },
          markers: {
            size: className?.includes("border-none") ? 3 : 4
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
      <Card className={cn("w-full h-full", className)}>
        <CardHeader className={className ? "bg-transparent" : "bg-slate-50 rounded-t-lg pb-3"}>
          <CardTitle className="text-slate-800">
            S&P Business Data Access Risk Breakdown
          </CardTitle>
          <CardDescription className="text-slate-500">
            Detailed breakdown of risk factors for this company
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-4 h-full">
          <Skeleton className="h-full w-full rounded-md flex-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full h-full", className)}>
      {/* Only show header with title/description if NOT in condensed view (border-none class indicates dashboard widget) */}
      {!className?.includes("border-none") && (
        <CardHeader className="bg-slate-50 rounded-t-lg pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-slate-800">
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
                      // Filter out FinTech companies and current company
                      .filter(c => c.id !== (company?.id || 0) && c.category !== 'FinTech')
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
      )}
      <CardContent className={cn("p-4 pb-6", className?.includes("border-none") ? "p-0" : "", "h-full flex-grow")}>
        <div className={cn("w-full rounded-md flex-grow", className?.includes("border-none") ? "h-full" : "h-[520px]")}>
          {chartComponentLoaded && ReactApexChart && (
            <ReactApexChart 
              options={chartOptions} 
              series={series} 
              type="radar" 
              height={className?.includes("border-none") ? "100%" : "520"}
              width="100%"
            />
          )}
          {!chartComponentLoaded && (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className={cn("w-full rounded-md", className?.includes("border-none") ? "h-full" : "h-[520px]")} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}