import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ChevronsUpDown, 
  PlusCircle,
  X,
  BarChart3,
  Search,
  RefreshCw,
  Info
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RiskDimension, CompanyComparison } from '@/lib/risk-score-configuration-data';
import { defaultRiskDimensions } from '@/lib/risk-score-configuration-data';
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ResponsiveChartWrapper } from '@/components/ui/responsive-chart-wrapper';

// Dynamic import for ApexCharts to avoid SSR issues
let ReactApexChart: any;

// Constants
const MAX_COMPARISONS = 3; // Maximum number of companies that can be added for comparison
// Using a diverse color palette with better contrast for comparison
const COMPANY_COLORS = [
  '#ef4444', // red-500 - Strong, distinctive comparison color
  '#22c55e', // green-500 - Good contrast for second company
  '#a855f7', // purple-500 - Third company color option
  '#f59e0b', // amber-500 - Additional option if needed
  '#06b6d4'  // cyan-500 - Fifth option
];

// Component Props Interface
export interface ComparativeVisualizationProps {
  dimensions: RiskDimension[];
  globalScore?: number;
  riskLevel?: string;
  width?: number;
  height?: number;
}

/**
 * Internal ComparativeVisualization component with fixed dimensions
 * Handles the radar chart and comparison logic
 */
function ComparativeVisualizationInternal({ 
  dimensions, 
  globalScore, 
  riskLevel,
  width = 800,
  height = 500 
}: ComparativeVisualizationProps) {
  const { company } = useCurrentCompany();
  const [selectedCompanies, setSelectedCompanies] = useState<CompanyComparison[]>([]);
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIndustryAverageAdded, setIsIndustryAverageAdded] = useState(false);
  const { toast } = useToast();

  // Track when dimensions change to update visualization
  const [currentCompanyData, setCurrentCompanyData] = useState<CompanyComparison>({
    id: company?.id || 0,
    name: company?.name || 'Invela Trust Network',
    companyType: company?.category || 'Current',
    description: 'Your current S&P Data Access Risk Score configuration',
    score: globalScore || 0,
    dimensions: {}
  });
  
  // Fetch network companies for comparison
  const { data: networkCompanies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['/api/risk-score/network-companies', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      
      const response = await fetch(`/api/risk-score/network-companies?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch network companies');
      }
      return response.json();
    },
    enabled: searchPopoverOpen, // Only fetch when the popover is open
  });
  
  // Fetch industry average for comparison
  const { data: industryAverage, isLoading: isLoadingIndustryAvg } = useQuery({
    queryKey: ['/api/risk-score/industry-average'],
    queryFn: async () => {
      const response = await fetch('/api/risk-score/industry-average');
      if (!response.ok) {
        throw new Error('Failed to fetch industry average');
      }
      return response.json();
    },
  });
  
  // Handle adding a company to the comparison list
  const handleAddCompany = (company: CompanyComparison) => {
    if (selectedCompanies.length >= MAX_COMPARISONS) {
      toast({
        title: "Maximum Comparisons Reached",
        description: `You can only compare up to ${MAX_COMPARISONS} companies at once.`,
        variant: "destructive"
      });
      return;
    }
    
    if (selectedCompanies.some(c => c.id === company.id)) {
      toast({
        title: "Company Already Added",
        description: `${company.name} is already in your comparison list.`,
        variant: "default"
      });
      return;
    }
    
    setSelectedCompanies(prev => [...prev, company]);
    setSearchQuery('');
    setSearchPopoverOpen(false);
    
    toast({
      title: "Company Added",
      description: `${company.name} has been added to your comparison.`,
      variant: "default"
    });
  };
  
  // Handle removing a company from the comparison list
  const handleRemoveCompany = (companyId: number) => {
    setSelectedCompanies(prev => prev.filter(c => c.id !== companyId));
  };
  
  // Handle adding/removing industry average
  const handleToggleIndustryAverage = () => {
    if (isIndustryAverageAdded) {
      setSelectedCompanies(prev => prev.filter(c => c.id !== -1));
      setIsIndustryAverageAdded(false);
    } else {
      if (industryAverage) {
        handleAddCompany(industryAverage);
        setIsIndustryAverageAdded(true);
      }
    }
  };

  // Update current company data when dimensions or score changes
  useEffect(() => {
    if (dimensions && dimensions.length > 0) {
      // Calculate weighted average if we have a globalScore
      const score = globalScore || 0;
      
      // Normalize dimensions based on the current risk configuration
      const dimensionValues = dimensions.reduce((acc, dim) => {
        if (globalScore !== undefined && globalScore > 0) {
          // Calculate contribution based on weight
          const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
          const weightContribution = dim.weight / totalWeight;
          
          // Apply weighting to create realistic variance:
          // 1. Base score affects all dimensions
          // 2. Weight distribution creates realistic variance between dimensions  
          // 3. Higher weighted dimensions (higher priority) have larger radar points
          const scaledValue = globalScore * (weightContribution * 3); // Enhanced factor to make differences more visible
          
          // Ensure the value is within range and weighted properly
          acc[dim.id] = Math.min(100, Math.max(0, scaledValue));
        } else {
          // Default behavior without global score
          acc[dim.id] = dim.value;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Update the current company data
      setCurrentCompanyData({
        id: company?.id || 0,
        name: company?.name || 'Invela Trust Network',
        companyType: company?.category || 'Current',
        description: `Your current S&P Data Access Risk Score configuration`,
        score: Math.round(score), // Round to nearest integer
        dimensions: dimensionValues
      });
    }
  }, [dimensions, company, globalScore, riskLevel]);

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
      color: '#1e3a8a' // Blue-900 - Deeper blue for current company to clearly stand out from comparison colors
    }
  ];

  // Add comparison companies to the series
  selectedCompanies.forEach((company, index) => {
    series.push({
      name: company.name,
      data: dimensions.map(dim => company.dimensions[dim.id] || 0),
      color: COMPANY_COLORS[index % COMPANY_COLORS.length]
    });
  });

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
          colors: dimensions.map((_, index) => {
            // Match colors to the weight distribution gradient colors in the right panel
            return index === 0 ? '#1a2530' : 
                  index === 1 ? '#2c3e50' :
                  index === 2 ? '#34495e' :
                  index === 3 ? '#4a6178' :
                  index === 4 ? '#607993' : '#7f8c8d';
          })
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
      show: false
    },
    markers: {
      width: 12,
      height: 12,
      radius: 3,
      offsetX: -2
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
        size: Math.min(width * 0.35, height * 0.5), // Responsive radar size based on container dimensions
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Control panel for comparisons */}
      <div className="space-y-4">
        {/* Search and buttons row */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {/* Company Search - Made wider */}
          <div className="flex-1 min-w-[300px]">
            <Popover open={searchPopoverOpen} onOpenChange={setSearchPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchPopoverOpen}
                  className="w-full justify-between text-left font-normal"
                  disabled={selectedCompanies.length >= MAX_COMPARISONS}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {selectedCompanies.length >= MAX_COMPARISONS 
                        ? `Maximum ${MAX_COMPARISONS} companies reached` 
                        : "Search and add companies to compare..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search companies by name..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {isLoadingCompanies ? (
                      <div className="p-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ) : networkCompanies.length === 0 ? (
                      <CommandEmpty>
                        {searchQuery ? 'No companies found.' : 'Type to search companies...'}
                      </CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {networkCompanies.map((company: CompanyComparison) => {
                          const isSelected = selectedCompanies.some(c => c.id === company.id);
                          return (
                            <CommandItem
                              key={company.id}
                              value={company.name}
                              onSelect={() => !isSelected && handleAddCompany(company)}
                              className={cn(
                                "flex items-center justify-between py-3 px-4 cursor-pointer",
                                isSelected && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={isSelected}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{company.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {company.companyType} • Risk Score: {company.score}
                                  </div>
                                </div>
                              </div>
                              {isSelected ? (
                                <Check className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <PlusCircle className="h-4 w-4 text-primary" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Industry Average Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isIndustryAverageAdded ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleIndustryAverage}
                  disabled={!industryAverage || (selectedCompanies.length >= MAX_COMPARISONS && !isIndustryAverageAdded)}
                  className="whitespace-nowrap"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isLoadingIndustryAvg ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : isIndustryAverageAdded ? (
                    'Remove Industry Avg'
                  ) : (
                    'Add Industry Avg'
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {isIndustryAverageAdded 
                    ? 'Remove industry average from comparison' 
                    : 'Add industry average for benchmark comparison'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Selected companies list */}
        {selectedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCompanies.map((company, index) => (
              <Badge
                key={company.id}
                variant="secondary"
                className="flex items-center gap-2 py-1 px-3"
                style={{
                  borderColor: COMPANY_COLORS[index % COMPANY_COLORS.length],
                  backgroundColor: `${COMPANY_COLORS[index % COMPANY_COLORS.length]}20`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                />
                <span className="text-sm font-medium">{company.name}</span>
                <button
                  onClick={() => {
                    handleRemoveCompany(company.id);
                    if (company.id === -1) setIsIndustryAverageAdded(false);
                  }}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Radar chart card */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
        <CardContent className="pt-6">
          {chartComponentLoaded ? (
            <div className="flex flex-col items-center">
              
              {/* Animated entry wrapper for chart */}
              <div 
                className="w-full overflow-visible transform transition-all duration-500 animate-in zoom-in-95 fade-in-50"
                style={{ 
                  filter: selectedCompanies.length > 0 ? 'none' : 'grayscale(0.5)',
                  opacity: selectedCompanies.length > 0 ? 1 : 0.8
                }}
              >
                <ReactApexChart
                  options={chartOptions}
                  series={series}
                  type="radar"
                  height={height}
                  width={width}
                />
              </div>
              
              {/* Chart legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1e3a8a' }}></div>
                  <span className="text-sm font-medium">{currentCompanyData.name}</span>
                </div>
                {selectedCompanies.map((company, index) => (
                  <div key={company.id} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium">{company.name}</span>
                  </div>
                ))}
              </div>
              
              {/* Helper text */}
              {selectedCompanies.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">
                    Add companies above to see comparative analysis
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center" style={{ height }}>
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading comparative visualization...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison details card - only show if companies are selected */}
      {selectedCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Risk Profile Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current company */}
              <div className="p-4 rounded-lg bg-background/50 border shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1e3a8a' }}></div>
                  <h3 className="font-medium">{currentCompanyData.name}</h3>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Your Risk Configuration</h4>
                  <p className="text-xs text-muted-foreground">{currentCompanyData.description}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Overall Risk Score</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-full bg-accent/30 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${currentCompanyData.score}%`, backgroundColor: '#1e3a8a' }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{currentCompanyData.score}</span>
                  </div>
                </div>
              </div>

              {/* Comparison companies */}
              {selectedCompanies.map((company, index) => (
                <div key={company.id} className="p-4 rounded-lg bg-background/50 border shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                    ></div>
                    <h3 className="font-medium">{company.name}</h3>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{company.companyType}</h4>
                    <p className="text-xs text-muted-foreground">{company.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Overall Risk Score</h4>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-full bg-accent/30 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-2.5 rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${company.score}%`, 
                            backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{company.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Responsive ComparativeVisualization component with error boundary
 * Automatically adapts to container dimensions and provides graceful error handling
 */
export function ComparativeVisualization({ className, ...props }: { className?: string } & Omit<ComparativeVisualizationProps, 'width' | 'height'>) {
  return (
    <ChartErrorBoundary>
      <ResponsiveChartWrapper 
        className={className}
        aspectRatio={16/10}
        minWidth={400}
      >
        {({ width, height }) => (
          <ComparativeVisualizationInternal 
            width={width} 
            height={height} 
            {...props}
          />
        )}
      </ResponsiveChartWrapper>
    </ChartErrorBoundary>
  );
}