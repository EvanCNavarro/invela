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
  RefreshCw
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

// Dynamic import for ApexCharts to avoid SSR issues
let ReactApexChart: any;

// Constants
const MAX_COMPARISONS = 3; // Maximum number of companies that can be added for comparison
const COMPANY_COLORS = [
  '#F43F5E', // Rose
  '#8B5CF6', // Violet
  '#10B981', // Emerald
];

interface ComparativeVisualizationProps {
  dimensions: RiskDimension[];
  globalScore?: number; // Optional prop to override calculated score
  riskLevel?: string; // Optional risk level prop
}

export function ComparativeVisualization({ 
  dimensions, 
  globalScore, 
  riskLevel 
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
      color: '#4965EC' // Blue color for current company
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
        size: 180, // Increased from 140 to 180
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
      {/* Control panel for comparisons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Industry Average Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isIndustryAverageAdded ? "secondary" : "outline"}
                size="sm"
                className="flex items-center gap-2"
                onClick={handleAddIndustryAverage}
                disabled={isIndustryAverageAdded || selectedCompanies.length >= MAX_COMPARISONS || isLoadingIndustryAvg}
              >
                {isLoadingIndustryAvg ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                Industry Average
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compare with industry average risk profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Company Search */}
        <Popover open={searchPopoverOpen} onOpenChange={setSearchPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={selectedCompanies.length >= MAX_COMPARISONS}
            >
              <Search className="h-4 w-4" />
              Search Companies
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput 
                placeholder="Search network companies..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              {isLoadingCompanies ? (
                <div className="py-6 text-center">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground pt-2">Searching companies...</p>
                </div>
              ) : (
                <CommandList>
                  <CommandEmpty>No companies found</CommandEmpty>
                  <CommandGroup heading="Network Companies">
                    {networkCompanies.map((company: CompanyComparison) => (
                      <CommandItem
                        key={company.id}
                        value={company.name}
                        onSelect={() => handleAddCompany(company)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span>{company.name}</span>
                            <span className="text-xs text-muted-foreground">{company.companyType}</span>
                          </div>
                          <PlusCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              )}
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Selected Companies Badges */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {selectedCompanies.map((company, index) => (
            <Badge
              key={company.id}
              variant="secondary"
              className="flex items-center gap-1 pl-3 pr-2 py-1"
              style={{ borderLeft: `3px solid ${COMPANY_COLORS[index % COMPANY_COLORS.length]}` }}
            >
              {company.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => handleRemoveCompany(company.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {/* Empty slots indicators */}
          {Array.from({ length: MAX_COMPARISONS - selectedCompanies.length }).map((_, i) => (
            <Badge
              key={`empty-${i}`}
              variant="outline"
              className="border-dashed pl-3 pr-2 py-1 text-muted-foreground"
            >
              Add company...
            </Badge>
          ))}
        </div>
      </div>

      {/* Radar chart card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Comparative Risk Dimension Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartComponentLoaded ? (
            <div className="flex justify-center">
              <div className="w-full overflow-visible">
                <ReactApexChart
                  options={chartOptions}
                  series={series}
                  type="radar"
                  height="450"
                  width="100%"
                />
              </div>
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
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4965EC' }}></div>
                  <h3 className="font-medium">{currentCompanyData.name}</h3>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Your Risk Configuration</h4>
                  <p className="text-xs text-muted-foreground">{currentCompanyData.description}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Overall Risk Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full" 
                        style={{ width: `${currentCompanyData.score}%`, backgroundColor: '#4965EC' }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{currentCompanyData.score}/100</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Key Priorities</h4>
                  <ul className="text-xs text-muted-foreground mt-1">
                    {dimensions.slice(0, 2).map(dim => (
                      <li key={dim.id}>{dim.name} ({Math.round(dim.weight)}%)</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Grid of comparison companies */}
              <div className="space-y-6">
                {selectedCompanies.map((company, index) => (
                  <div key={company.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                      ></div>
                      <h3 className="font-medium">{company.name}</h3>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">Risk Score</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full"
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
                        <h4 className="font-medium text-sm">Difference</h4>
                        <span className={`text-sm ${
                          currentCompanyData.score > company.score 
                            ? 'text-amber-600' 
                            : currentCompanyData.score < company.score 
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                        }`}>
                          {currentCompanyData.score > company.score 
                            ? `+${currentCompanyData.score - company.score}%`
                            : currentCompanyData.score < company.score
                              ? `-${company.score - currentCompanyData.score}%`
                              : 'Equal'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Insights section */}
            <div className="mt-8 pt-4 border-t">
              <h4 className="font-medium mb-3">Risk Profile Insights</h4>
              <div className="space-y-4">
                {selectedCompanies.map((company, index) => (
                  <div key={`insight-${company.id}`} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                      ></div>
                      <p className="text-sm font-medium">Compared to {company.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentCompanyData.score > company.score 
                        ? `Your risk configuration is more conservative (${currentCompanyData.score - company.score}% higher) than ${company.name}.`
                        : currentCompanyData.score < company.score
                          ? `Your risk configuration is less conservative (${company.score - currentCompanyData.score}% lower) than ${company.name}.`
                          : `Your risk configuration matches ${company.name}'s overall score.`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentCompanyData.score > company.score + 15
                        ? "Consider reviewing your priorities to align more closely with industry standards."
                        : currentCompanyData.score < company.score - 15
                        ? "Your risk profile is lower than comparable companies. Consider elevating key priorities."
                        : "Your risk profile is well-aligned with similar companies. Continue monitoring changes in risk landscape."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
