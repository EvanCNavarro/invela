import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Eye, EyeOff } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RiskDimension, CompanyComparison } from '@/lib/risk-score-configuration-types';
import { sampleCompanyComparisons, defaultRiskDimensions } from '@/lib/risk-score-configuration-data';
import { useCurrentCompany } from "@/hooks/use-current-company";

// Dynamic import for ApexCharts to avoid SSR issues
let ReactApexChart: any;

interface ComparativeVisualizationProps {
  dimensions: RiskDimension[];
}

export function ComparativeVisualization({ dimensions }: ComparativeVisualizationProps) {
  const { company } = useCurrentCompany();
  const [selectedCompany, setSelectedCompany] = useState<CompanyComparison | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  // Prepare current company data in the same format as comparison companies
  const currentCompanyData: CompanyComparison = {
    id: company?.id || 0,
    name: company?.name || 'Your Company',
    companyType: company?.category || 'Current',
    description: 'Your current risk configuration',
    score: dimensions.reduce((sum, dim) => sum + (dim.weight * dim.value / 100), 0),
    dimensions: dimensions.reduce((acc, dim) => {
      acc[dim.id] = dim.value;
      return acc;
    }, {} as Record<string, number>)
  };

  // Load ApexCharts component only on client side
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

  // Construct the series data for the chart
  const series = [
    {
      name: currentCompanyData.name,
      data: dimensions.map(dim => currentCompanyData.dimensions[dim.id] || 0),
      color: '#4965EC'
    }
  ];

  // Add comparison company to the series if selected
  if (showComparison && selectedCompany) {
    series.push({
      name: selectedCompany.name,
      data: dimensions.map(dim => selectedCompany.dimensions[dim.id] || 0),
      color: '#F97066'
    });
  }

  // Chart configuration options
  const chartOptions = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false
      },
      background: 'transparent',
    },
    xaxis: {
      categories: dimensions.map(dim => dim.name),
      labels: {
        style: {
          fontSize: '11px',
          fontWeight: 500,
          colors: Array(dimensions.length).fill('#64748b')
        }
      }
    },
    yaxis: {
      show: false,
      min: 0,
      max: 100
    },
    fill: {
      opacity: 0.2
    },
    stroke: {
      width: 2,
      dashArray: 0,
      lineCap: 'round'
    },
    legend: {
      show: true,
      position: 'top',
      fontWeight: 600,
      fontSize: '13px',
      offsetY: 0,
      itemMargin: {
        horizontal: 15,
      },
      labels: {
        colors: '#334155'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 3,
        offsetX: -2
      }
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        title: {
          formatter: () => 'Score'
        },
        formatter: (val: number) => val.toString()
      },
      marker: {
        show: true
      }
    },
    plotOptions: {
      radar: {
        size: 140,
        offsetY: 0,
        offsetX: 0,
        polygons: {
          strokeColors: '#e2e8f0',
          strokeWidth: 1,
          connectorColors: '#e2e8f0',
          fill: {
            colors: ['transparent', 'transparent']
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 992,
        options: {
          plotOptions: {
            radar: {
              size: 120,
              offsetY: 0
            }
          }
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between text-muted-foreground"
              >
                {selectedCompany ? selectedCompany.name : "Select company to compare..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search companies..." />
                <CommandEmpty>No company found.</CommandEmpty>
                <CommandGroup>
                  {sampleCompanyComparisons.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.name}
                      onSelect={() => {
                        setSelectedCompany(company);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{company.name}</span>
                        <span className="text-xs text-muted-foreground">{company.companyType}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 ${!selectedCompany ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => setShowComparison(!showComparison)}
          disabled={!selectedCompany}
        >
          {showComparison ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide Comparison
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Comparison
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Comparative Risk Dimension Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartComponentLoaded ? (
            <div className="flex justify-center">
              <ReactApexChart
                options={chartOptions}
                series={series}
                type="radar"
                height="400"
                width="100%"
              />
            </div>
          ) : (
            <div className="h-400 w-full flex items-center justify-center">
              <Skeleton className="w-full h-[400px] rounded-md" />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {selectedCompany.name} Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Company Type</h4>
                <p className="text-muted-foreground">{selectedCompany.companyType}</p>
              </div>
              <div>
                <h4 className="font-medium">Description</h4>
                <p className="text-muted-foreground">{selectedCompany.description}</p>
              </div>
              <div>
                <h4 className="font-medium">Overall Risk Score</h4>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full"
                      style={{ width: `${selectedCompany.score}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{selectedCompany.score}/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
