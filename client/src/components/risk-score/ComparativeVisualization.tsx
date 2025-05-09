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
  globalScore?: number; // Optional prop to override calculated score
  riskLevel?: string; // Optional risk level prop
}

export function ComparativeVisualization({ 
  dimensions, 
  globalScore, 
  riskLevel 
}: ComparativeVisualizationProps) {
  const { company } = useCurrentCompany();
  const [selectedCompany, setSelectedCompany] = useState<CompanyComparison | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  // Track when dimensions change to update visualization
  const [currentCompanyData, setCurrentCompanyData] = useState<CompanyComparison>({
    id: company?.id || 0,
    name: company?.name || 'Your Company',
    companyType: company?.category || 'Current',
    description: 'Your current risk configuration',
    score: globalScore || 0,
    dimensions: {}
  });
  
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
        description: `Your current S&P Data Access Risk Score configuration${riskLevel ? ` (${riskLevel} risk)` : ''}`,
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
      color: '#4965EC' // Blue color matching the dot in the comparison card
    }
  ];

  // Add comparison company to the series if selected
  if (showComparison && selectedCompany) {
    series.push({
      name: selectedCompany.name,
      data: dimensions.map(dim => selectedCompany.dimensions[dim.id] || 0),
      color: '#F43F5E' // Red color matching the dot in the comparison card
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

      {selectedCompany && showComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Risk Profile Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current configuration */}
              <div className="space-y-4 border-r pr-4">
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
              
              {/* Comparison company */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F43F5E' }}></div>
                  <h3 className="font-medium">{selectedCompany.name}</h3>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Company Type</h4>
                  <p className="text-xs text-muted-foreground">{selectedCompany.companyType}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Description</h4>
                  <p className="text-xs text-muted-foreground">{selectedCompany.description}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Overall Risk Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: `${selectedCompany.score}%`, backgroundColor: '#F43F5E' }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{selectedCompany.score}/100</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Score difference analysis */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium mb-2">Risk Profile Analysis</h4>
              <p className="text-sm text-muted-foreground">
                {currentCompanyData.score > selectedCompany.score 
                  ? `Your risk configuration is more conservative (${currentCompanyData.score - selectedCompany.score}% higher) than ${selectedCompany.name}.`
                  : currentCompanyData.score < selectedCompany.score
                    ? `Your risk configuration is less conservative (${selectedCompany.score - currentCompanyData.score}% lower) than ${selectedCompany.name}.`
                    : `Your risk configuration matches ${selectedCompany.name}'s overall score.`
                }
              </p>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-xs font-medium">Recommended Action</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentCompanyData.score > selectedCompany.score + 15
                    ? "Consider reviewing your priorities to align more closely with industry standards."
                    : currentCompanyData.score < selectedCompany.score - 15
                    ? "Your risk profile is lower than comparable companies. Consider elevating key priorities."
                    : "Your risk profile is well-aligned with industry standards. Continue monitoring changes in risk landscape."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
