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
      parentHeightOffset: 0,
      sparkline: {
        enabled: false
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
      size: 5, // Smaller markers for compact widget
      colors: ['#ffffff'],
      strokeColors: '#4965EC',
      strokeWidth: 2, // Thinner stroke for better appearance at smaller size
      hover: {
        size: 7, // Smaller hover size
      }
    },
    grid: {
      show: false, // Removed horizontal lines in the background
      padding: {
        top: 20,
        bottom: 20
      }
    },
    yaxis: {
      show: true,
      max: 500,
      tickAmount: 4, // Reduced number of ticks for better spacing
      labels: {
        style: {
          fontSize: '12px',
          fontWeight: 500,
          colors: ['#64748b']
        },
        formatter: (val: number) => Math.round(val).toString(),
        background: {
          enabled: false
        },
        padding: {
          left: 10,
          right: 10
        }
      }
    },
    xaxis: {
      categories: riskClusters ? formatCategoryNames(Object.keys(riskClusters)) : [],
      labels: {
        style: {
          fontSize: '14px',
          fontWeight: 600,
          colors: Array(6).fill('#1e293b')
        },
        rotate: 0,
        offsetY: 8,
        background: {
          enabled: true,
          borderRadius: 2,
          padding: 4,
          opacity: 0.9,
          borderWidth: 1,
          borderColor: '#f1f5f9'
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '11px',
        fontWeight: 'bold',
        colors: ['#1e293b']
      },
      background: {
        enabled: true,
        borderRadius: 3,
        padding: 2,
        opacity: 0.9,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      offsetY: -6
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
      },
      fixed: {
        enabled: false,
        position: 'topRight',
        offsetY: 0
      }
    },
    plotOptions: {
      radar: {
        size: 220, // Further reduced size for compact widget
        offsetY: 0,
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
        breakpoint: 1200,
        options: {
          plotOptions: {
            radar: {
              size: 200
            }
          }
        }
      },
      {
        breakpoint: 992,
        options: {
          plotOptions: {
            radar: {
              size: 180
            }
          },
          markers: {
            size: 6
          }
        }
      },
      {
        breakpoint: 768,
        options: {
          plotOptions: {
            radar: {
              size: 160
            }
          },
          markers: {
            size: 5
          },
          dataLabels: {
            enabled: false // Turn off data labels on smaller screens
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '11px'
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
              size: 140
            }
          },
          markers: {
            size: 4
          },
          yaxis: {
            labels: {
              style: {
                fontSize: '9px'
              }
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '10px'
              }
            }
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
      <Card className={cn("w-full", className)}>
        <CardHeader className={className ? "bg-transparent" : "bg-slate-50 rounded-t-lg pb-3"}>
          <CardTitle className="text-slate-800">
            S&P Business Data Access Risk Breakdown
          </CardTitle>
          <CardDescription className="text-slate-500">
            Detailed breakdown of risk factors for this company
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-2">
          <div className="w-full h-[340px] mx-auto">
            <Skeleton className="w-full h-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      {/* Show title and description only for full-width version with dropdown (Bank/Invela) */}
      {showDropdown && (
        <CardHeader className={className ? "bg-transparent" : "bg-slate-50 rounded-t-lg pb-3"}>
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
            {isBankOrInvela && networkCompanies && networkCompanies.length > 0 && (
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
      <CardContent className="p-0">
        <div 
          className={cn(
            "rounded-md flex flex-col items-center justify-center p-2",
            // Make a more reasonably sized chart container
            className?.includes("border-none") ? "w-full h-[340px]" : "w-full h-[340px] mx-auto"
          )}
        >
          {chartComponentLoaded && ReactApexChart ? (
            <div id="apexRadarChart" className="w-full h-full" style={{ 
              overflow: "visible",
              position: "relative",
              maxWidth: "100%",
              height: "100%"
            }}>
              <ReactApexChart 
                options={{
                  ...chartOptions,
                  chart: {
                    ...chartOptions.chart,
                    height: "100%",
                    width: "100%",
                    redrawOnWindowResize: true,
                    redrawOnParentResize: true,
                    offsetX: 0 // Center the chart
                  }
                }} 
                series={series} 
                type="radar" 
                height="100%"
                width="100%"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="w-full h-full rounded-md" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}