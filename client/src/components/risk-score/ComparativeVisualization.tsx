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
  '#2563eb', // Royal Blue - First comparison color
  '#0891b2', // Cyan - Second comparison color
  '#6366f1', // Indigo - Third comparison color
  '#0d9488', // Teal - Fallback comparison color
  '#8b5cf6', // Purple - Extra fallback color
];

interface ComparativeVisualizationProps {
  dimensions: RiskDimension[];
  globalScore?: number; // Optional prop to override calculated score
  riskLevel?: string; // Optional risk level prop
  width?: number;
  height?: number;
}

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
    // Check if we've reached the maximum number of comparisons
    if (selectedCompanies.length >= MAX_COMPARISONS) {
      toast({
        title: "Maximum comparisons reached",
        description: `You can compare up to ${MAX_COMPARISONS} companies at once. Remove one to add another.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if company is already in the list
    if (selectedCompanies.some(c => c.id === company.id)) {
      toast({
        title: "Company already added",
        description: "This company is already in your comparison list.",
        variant: "default",
      });
      return;
    }
    
    // Add company to selected list
    setSelectedCompanies([...selectedCompanies, company]);
    setSearchPopoverOpen(false);
  };
  
  // Handle removing a company from the comparison list
  const handleRemoveCompany = (companyId: number) => {
    setSelectedCompanies(selectedCompanies.filter(c => c.id !== companyId));
    
    // If removing industry average, update state
    if (companyId === 0) {
      setIsIndustryAverageAdded(false);
    }
  };
  
  // Handle adding industry average to comparison
  const handleAddIndustryAverage = () => {
    if (isIndustryAverageAdded) {
      toast({
        title: "Already added",
        description: "Industry Average is already in your comparison list.",
        variant: "default",
      });
      return;
    }
    
    if (selectedCompanies.length >= MAX_COMPARISONS) {
      toast({
        title: "Maximum comparisons reached",
        description: `You can compare up to ${MAX_COMPARISONS} companies at once. Remove one to add another.`,
        variant: "destructive",
      });
      return;
    }
    
    if (industryAverage) {
      setSelectedCompanies([...selectedCompanies, industryAverage]);
      setIsIndustryAverageAdded(true);
    }
  };
  
  // Update current company data when dimensions change or when globalScore changes
  useEffect(() => {
    if (dimensions.length > 0) {
      // If globalScore is provided, use it instead of calculating
      const score = globalScore !== undefined ? globalScore : dimensions.reduce((sum, dim) => {
        return sum + (dim.weight * dim.value / 100);
      }, 0);
      
      // Convert dimensions to format needed for visualization
      const dimensionValues = dimensions.reduce((acc, dim) => {
        // Scale dimension values based on global score and weight distribution if provided
        if (globalScore !== undefined) {
          // Get total weight of all dimensions
          const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
          
          // Calculate how this dimension's weight contributes to the whole (normalized)
          const weightContribution = dim.weight / totalWeight;
          
          // Scale value based on global score and weight contribution
          // This makes higher weighted dimensions have more impact on the radar chart
          // The formula creates a weighted distribution on the radar chart:
          // 1. Each dimension's value is proportional to its weight percentage
          // 2. The overall shape grows/shrinks based on the global score
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
          <Popover open={searchPopoverOpen} onOpenChange={setSearchPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm w-[300px]"
                disabled={selectedCompanies.length >= MAX_COMPARISONS}
              >
                <Search className="h-4 w-4" />
                Search Companies to Compare
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 shadow-md animate-in fade-in-50 zoom-in-95 slide-in-from-top-5">
              <Command>
                <CommandInput 
                  placeholder="Search network companies..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-b focus:ring-1 focus:ring-primary/20"
                />
                {isLoadingCompanies ? (
                  <div className="py-6 text-center">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground pt-2">Searching companies...</p>
                  </div>
                ) : (
                  <CommandList className="max-h-[250px]">
                    <CommandEmpty>No companies found</CommandEmpty>
                    <CommandGroup heading="Network Companies">
                      {networkCompanies.map((company: CompanyComparison) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => handleAddCompany(company)}
                          className="transition-colors duration-150 hover:bg-accent hover:text-accent-foreground cursor-pointer group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col">
                              <span>{company.name}</span>
                              <span className="text-xs text-muted-foreground">{company.companyType}</span>
                            </div>
                            <div className="transform transition-transform duration-200 group-hover:scale-110">
                              <PlusCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                )}
              </Command>
            </PopoverContent>
          </Popover>
          
          {/* Industry Average Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isIndustryAverageAdded ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    !isIndustryAverageAdded && !isLoadingIndustryAvg && 
                    selectedCompanies.length < MAX_COMPARISONS && 
                    "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm"
                  )}
                  onClick={handleAddIndustryAverage}
                  disabled={isIndustryAverageAdded || selectedCompanies.length >= MAX_COMPARISONS || isLoadingIndustryAvg}
                >
                  {isLoadingIndustryAvg ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4 mr-1" />
                  )}
                  Industry Average
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-background border shadow-md">
                <p>Add industry average to comparison</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Company slot cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Filled slots */}
          {selectedCompanies.map((company, index) => (
            <div 
              key={company.id}
              className="relative h-20 flex flex-col justify-center px-4 bg-blue-50/30 rounded-md shadow-sm border border-blue-200/30 overflow-hidden transition-all duration-200 hover:shadow-md hover:bg-blue-50/40 group animate-in fade-in-50 zoom-in-95"
              style={{ borderLeft: `4px solid ${COMPANY_COLORS[index % COMPANY_COLORS.length]}` }}
            >
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 hover:bg-background"
                  onClick={() => handleRemoveCompany(company.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-col">
                <div className="font-medium text-sm truncate">{company.name}</div>
                <div className="text-xs text-muted-foreground">{company.companyType}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-background/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${company.score}%`, 
                        backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] 
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">{company.score}</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty slots with "Compared Company #X" */}
          {Array.from({ length: MAX_COMPARISONS - selectedCompanies.length }).map((_, i) => (
            <div 
              key={`empty-${i}`}
              className="h-20 flex flex-col justify-center px-4 border border-dashed border-blue-200/30 rounded-md bg-blue-50/20 text-muted-foreground transition-all duration-300 hover:bg-blue-50/40"
            >
              <div className="flex flex-col">
                <div className="font-medium text-sm text-blue-400/70">Compared Company #{selectedCompanies.length + i + 1}</div>
                <div className="text-xs text-blue-400/50">Available slot</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-blue-100/50 rounded-full"></div>
                  <span className="text-xs font-medium text-blue-300/80">--</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Radar chart card */}
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
        <CardHeader className="bg-background/70 border-b">
          <CardTitle className="text-lg font-medium flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-muted-foreground" />
            Comparative Risk Dimension Analysis
          </CardTitle>
        </CardHeader>
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
                  <div key={`chart-legend-${company.id}`} className="flex items-center gap-2 animate-in fade-in-50">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium">{company.name}</span>
                  </div>
                ))}
              </div>
              
              {/* No companies selected message */}
              {selectedCompanies.length === 0 && (
                <div className="text-center text-blue-500/70 text-sm mt-4 p-3 border border-dashed border-blue-200 rounded-md bg-blue-50/30 transition-all duration-300 hover:bg-blue-50/50">
                  Add companies above to see comparative risk dimension analysis
                </div>
              )}
            </div>
          ) : (
            <div className="h-400 w-full flex items-center justify-center">
              <Skeleton className="w-full h-[400px] rounded-md" />
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
                    <span className="text-sm font-medium">{currentCompanyData.score}/100</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Key Priorities</h4>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    {dimensions.slice(0, 2).map(dim => (
                      <li key={dim.id} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dim.color }}></div>
                        <span>{dim.name} ({Math.round(dim.weight)}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Grid of comparison companies */}
              <div className="space-y-4">
                {selectedCompanies.map((company, index) => (
                  <div 
                    key={company.id} 
                    className="p-4 rounded-lg bg-background/50 border shadow-sm hover:shadow-md transition-shadow duration-200"
                    style={{ borderLeft: `3px solid ${COMPANY_COLORS[index % COMPANY_COLORS.length]}` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                      ></div>
                      <h3 className="font-medium">{company.name}</h3>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {company.companyType}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Risk Score</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-accent/30 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${company.score}%`, 
                                backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">{company.score}/100</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-1">Comparison</h4>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                              currentCompanyData.score > company.score 
                                ? 'bg-blue-100 text-blue-800' 
                                : currentCompanyData.score < company.score 
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {currentCompanyData.score > company.score 
                              ? `+${currentCompanyData.score - company.score}%`
                              : currentCompanyData.score < company.score
                                ? `-${company.score - currentCompanyData.score}%`
                                : 'Equal'
                            }
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {currentCompanyData.score > company.score 
                              ? 'Higher risk'
                              : currentCompanyData.score < company.score
                                ? 'Lower risk'
                                : 'Equal risk'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-muted-foreground">
                      {currentCompanyData.score > company.score + 15
                        ? "Your configuration is more conservative. Consider reviewing priorities."
                        : currentCompanyData.score < company.score - 15
                        ? "Your profile is less conservative than this comparison benchmark."
                        : "Your risk profile is well-aligned with this benchmark."}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Insights section */}
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center mb-4">
                <h4 className="font-medium">Risk Profile Insights</h4>
                <div className="ml-auto text-xs text-muted-foreground">Based on your comparison selections</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedCompanies.map((company, index) => {
                  // Calculate the difference percentage
                  const difference = currentCompanyData.score - company.score;
                  const absDifference = Math.abs(difference);
                  
                  // Determine color and icon based on difference using blue variations
                  let bgColor = 'bg-slate-50';
                  let borderColor = 'border-slate-200';
                  
                  if (difference > 15) {
                    bgColor = 'bg-blue-50';
                    borderColor = 'border-blue-200';
                  } else if (difference < -15) {
                    bgColor = 'bg-sky-50';
                    borderColor = 'border-sky-200';
                  }
                  
                  return (
                    <div 
                      key={`insight-${company.id}`} 
                      className={`p-4 rounded-lg border animate-in fade-in-50 ${bgColor} ${borderColor} transition-all duration-300 hover:shadow-sm`}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <div className="mt-1">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{company.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span 
                              className={`inline-block px-1.5 py-0.5 text-xs rounded-sm ${
                                difference > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : difference < 0 
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {difference > 0 
                                ? `+${difference}%` 
                                : difference < 0 
                                  ? `-${absDifference}%` 
                                  : 'Equal'
                              }
                            </span>
                            <span className="text-xs text-muted-foreground">difference</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-foreground/90">
                        {difference > 0 
                          ? `Your risk configuration is more conservative than ${company.name}'s profile.`
                          : difference < 0
                            ? `Your risk configuration is less conservative than ${company.name}'s profile.`
                            : `Your risk configuration matches ${company.name}'s risk profile.`
                        }
                      </div>
                      
                      <div className="mt-3 rounded-md bg-background/70 p-2 text-xs text-muted-foreground">
                        <div className="font-medium mb-1">Recommendation</div>
                        {difference > 15
                          ? "Consider reviewing your priorities to more closely align with industry standards."
                          : difference < -15
                          ? "Your risk profile is lower than comparable companies. Consider elevating key priorities."
                          : "Your risk profile is well-aligned with similar companies. Continue monitoring changes in the risk landscape."}
                      </div>
                    </div>
                  );
                })}
              </div>
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
