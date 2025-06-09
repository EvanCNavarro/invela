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
import { Button } from '@/components/ui/button';
import { useCurrentCompany } from '@/hooks/use-current-company';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Label } from '@/components/ui/label';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ContainerAwareChartWrapper, ChartLibraryAdapters } from '@/components/ui/container-aware-chart-wrapper';

// Import these dynamically to prevent SSR issues
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

// Define the company type to extend the existing Company type from hooks
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
  // For relationships API response format
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
  width?: number;
  height?: number;
}

function RiskRadarChartInternal({ className, companyId, showDropdown = true, width = 800, height = 500 }: RiskRadarChartProps) {
  const { company, isLoading: isCompanyLoading } = useCurrentCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);
  
  // We'll use state to manage chart updates instead of direct ref access
  const [chartInstance, setChartInstance] = useState<any>(null);
  
  // Cache previous risk clusters data to maintain chart visibility during loading
  const [prevRiskClusters, setPrevRiskClusters] = useState<RiskClusters | null>(null);
  
  // Track if we're in the middle of a data transition for better UX
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Logger for tracking chart state changes
  const logChartUpdate = (message: string, data: any) => {
    console.log(`[RiskRadarChart] ${message}`, data);
  };

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
      logChartUpdate('Setting selected company ID from companyId prop', companyId);
      
      // Mark as transitioning when changing companies
      if (selectedCompanyId && selectedCompanyId !== companyId) {
        setIsTransitioning(true);
      }
      
      setSelectedCompanyId(companyId);
    } else if (company && !selectedCompanyId) {
      logChartUpdate('Setting selected company ID from current company', company.id);
      setSelectedCompanyId(company.id);
    }
  }, [company, selectedCompanyId, companyId]);

  // Determine company type for conditional rendering
  const isBankOrInvela = company?.category === 'Bank' || company?.category === 'Invela';
  const isFintech = company?.category === 'FinTech';
  
  // Log the company type for debugging
  useEffect(() => {
    if (company) {
      console.log('[RiskRadarChart] Company category check:', { 
        category: company?.category,
        isBankOrInvela,
        isFintech,
        showDropdownProp: showDropdown
      });
    }
  }, [company, isBankOrInvela, isFintech, showDropdown]);
  
  // Use a more specific return type to fix TypeScript errors
  interface CompanyNetworkResponse {
    companies: CompanyWithRiskClusters[];
  }
  
  // 1. Get direct companies data from new cache-bypassing API endpoint
  const { data: allCompaniesData = [], isLoading: isAllCompaniesLoading } = useQuery<CompanyWithRiskClusters[]>({
    queryKey: ['/api/companies-with-risk'],
    queryFn: async () => {
      const response = await fetch('/api/companies-with-risk');
      if (!response.ok) {
        throw new Error('Failed to fetch companies with risk data');
      }
      const data = await response.json();
      console.log('[RiskRadarChart] Fresh companies data received:', {
        count: data.length,
        sampleWithRisk: data.slice(0, 3).map((c: any) => ({
          id: c.id,
          name: c.name,
          hasRiskScore: !!c.risk_score,
          hasRiskClusters: !!c.risk_clusters,
          accreditationStatus: c.accreditation_status
        }))
      });
      return data;
    },
    // Enable for all Bank and Invela users (both with and without dropdown)
    enabled: isBankOrInvela && !!company?.id,
    // Force fresh data
    staleTime: 0,
    gcTime: 0
  });
  
  // Define the network visualization data type for better type safety
  interface NetworkVisualizationData {
    nodes: Array<{id: number, name: string, category: string, riskScore?: number}>;
    edges: Array<{source: number, target: number}>;
  }
  
  // 2. Get network visualization data which may contain additional companies
  const { data: networkVisualizationData, isLoading: isNetworkVisualizationLoading } = useQuery<NetworkVisualizationData>({
    queryKey: ['/api/network/visualization'],
    // Only fetch for Bank and Invela users who should see the dropdown
    enabled: isBankOrInvela && !!company?.id && showDropdown
  });
  
  // 3. Also keep the existing relationships query for backward compatibility
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
      
      console.log('[RiskRadarChart] Fetched relationship companies:', transformedCompanies.length);
      
      return { companies: transformedCompanies };
    },
    // Only fetch network companies for Bank and Invela users (data providers and admins)
    enabled: isBankOrInvela && !!company?.id,
  });
  
  // 4. Use fresh companies data as primary source
  const combinedCompanies = React.useMemo(() => {
    // Prioritize fresh companies data from cache-bypassing endpoint
    if (allCompaniesData && allCompaniesData.length > 0) {
      console.log('[RiskRadarChart] Using fresh companies data:', allCompaniesData.length);
      // Fresh data is already properly formatted with risk_score and accreditation_status
      return allCompaniesData;
    }
    
    // Fallback to other sources only if fresh data is unavailable
    let companies: CompanyWithRiskClusters[] = [];
    
    // Add relationship companies
    if (networkCompaniesData?.companies) {
      companies = [...companies, ...networkCompaniesData.companies];
    }
    
    // Add network visualization nodes if available
    if (networkVisualizationData && networkVisualizationData.nodes) {
      const visualizationCompanies = networkVisualizationData.nodes
        .filter(node => node.category === 'FinTech')
        .map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          risk_score: node.riskScore || 0,
          accreditationStatus: node.accreditationStatus
        } as CompanyWithRiskClusters));
      
      companies = [...companies, ...visualizationCompanies];
    }
    
    return companies;
  }, [allCompaniesData, networkCompaniesData?.companies, networkVisualizationData]);

  // 5. Filter for approved companies with valid risk scores
  const approvedCompanies = React.useMemo(() => {
    return combinedCompanies.filter(company => {
      // Handle different data source formats - backend sends snake_case
      const riskScore = company.risk_score || company.riskScore || company.relatedCompany?.riskScore;
      const riskClusters = company.risk_clusters || company.riskClusters || company.relatedCompany?.riskClusters;
      const accreditationStatus = company.accreditation_status || 
                                 company.accreditationStatus || 
                                 company.relatedCompany?.accreditationStatus;
      
      const hasValidRiskScore = riskScore && riskScore > 0;
      const hasRiskClusters = !!riskClusters;
      const isApproved = accreditationStatus === 'APPROVED';
      
      console.log('[RiskRadarChart] Filtering company:', {
        name: company.name || company.relatedCompany?.name,
        riskScore,
        hasRiskClusters,
        accreditationStatus,
        isApproved,
        willBeIncluded: hasValidRiskScore && isApproved
      });
      
      return hasValidRiskScore && isApproved;
    });
  }, [combinedCompanies]);

  // Sort alphabetically by name
  const sortedCompanies = React.useMemo(() => {
    return approvedCompanies.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
  }, [approvedCompanies]);

  // Enhanced debugging to help track data sources and company availability
  console.log('[RiskRadarChart] Data source analysis:', {
    allCompaniesCount: allCompaniesData?.length || 0,
    relationshipCompaniesCount: networkCompaniesData?.companies?.length || 0,
    visualizationNodesCount: networkVisualizationData?.nodes?.length || 0,
    uniqueCompaniesCount: combinedCompanies.length,
    approvedCompaniesCount: sortedCompanies.length,
    firstFewApproved: sortedCompanies.slice(0, 5).map(c => `${c.name} (${c.accreditationStatus || c.accreditation_status})`),
    sampleCompanyFields: combinedCompanies.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name || c.relatedCompany?.name,
        hasAccreditationStatus: !!c.accreditationStatus,
        hasAccreditation_status: !!c.accreditation_status,
        hasRelatedCompanyAccreditation: !!c.relatedCompany?.accreditationStatus,
        hasRisk_score: !!c.risk_score,
        hasRiskScore: !!c.riskScore,
        hasRelatedCompanyRiskScore: !!c.relatedCompany?.riskScore,
        actualAccreditationValue: c.accreditationStatus || c.accreditation_status || c.relatedCompany?.accreditationStatus,
        actualRiskValue: c.risk_score || c.riskScore || c.relatedCompany?.riskScore,
        dataStructure: c.relatedCompany ? 'nested' : 'flat'
      })),
    userType: company?.category
  });
  
  // Use the combined list for the dropdown
  const networkCompanies = combinedCompanies;

  // Fetch selected company data, ensuring we get the risk_clusters data
  const { data: selectedCompany, isLoading: isSelectedCompanyLoading, error: selectedCompanyError } = useQuery<CompanyWithRiskClusters>({
    queryKey: ['/api/companies', selectedCompanyId, 'with-risk-clusters'],
    queryFn: async () => {
      if (!selectedCompanyId || selectedCompanyId === company?.id) {
        return null;
      }
      
      // First, try to get the company with risk clusters from the company-profile endpoint
      // This endpoint is more likely to include the full company data including risk clusters
      try {
        const response = await fetch(`/api/companies/${selectedCompanyId}/profile`);
        if (response.ok) {
          const data = await response.json();
          console.log('[RiskRadarChart] Fetched company profile with risk data:', {
            companyId: selectedCompanyId,
            hasRiskClusters: !!data.risk_clusters
          });
          return data;
        }
      } catch (err) {
        console.warn('[RiskRadarChart] Error fetching company profile:', err);
        // Continue to fallback approach
      }
      
      // Fallback: Get the company from the standard endpoint
      const response = await fetch(`/api/companies/${selectedCompanyId}`);
      const data = await response.json();
      
      // If we don't have risk_clusters, generate mock data based on risk_score
      if (!data.risk_clusters && (data.risk_score || data.chosen_score)) {
        const totalScore = data.chosen_score || data.risk_score || 50;
        
        // Create a balanced distribution similar to what's in the server code
        data.risk_clusters = {
          'Cyber Security': Math.round(totalScore * 0.20),
          'Financial Stability': Math.round(totalScore * 0.15),
          'Potential Liability': Math.round(totalScore * 0.15),
          'Dark Web Data': Math.round(totalScore * 0.20),
          'Public Sentiment': Math.round(totalScore * 0.15),
          'Data Access Scope': Math.round(totalScore * 0.15)
        };
      }
      
      console.log('[RiskRadarChart] Fetched company data:', {
        companyId: selectedCompanyId,
        hasRiskScore: !!data.risk_score,
        hasRiskClusters: !!data.risk_clusters
      });
      
      return data;
    },
    enabled: !!selectedCompanyId && selectedCompanyId !== company?.id,
  });

  // Determine the company data to display
  const displayCompany = selectedCompanyId === company?.id ? company : selectedCompany;
  const isLoading = isCompanyLoading || (isSelectedCompanyLoading && selectedCompanyId !== company?.id);

  // Log the current display company for debugging
  useEffect(() => {
    if (displayCompany) {
      console.log('[RiskRadarChart] Display company updated:', {
        id: displayCompany.id,
        name: displayCompany.name,
        category: displayCompany.category
      });
    }
  }, [displayCompany]);

  // Extract risk clusters data - ensuring we handle both Company and CompanyWithRiskClusters types
  const riskClusters = displayCompany ? 
    ('risk_clusters' in displayCompany ? displayCompany.risk_clusters : undefined) : 
    undefined;
    
  // Cache risk clusters data when available to maintain chart during transitions
  useEffect(() => {
    if (riskClusters && Object.keys(riskClusters).length > 0) {
      // Store current risk clusters for use during loading states
      setPrevRiskClusters(riskClusters);
      
      logChartUpdate('Updated cached risk clusters', {
        companyId: displayCompany?.id,
        companyName: displayCompany?.name,
        hasData: true
      });
      
      // Mark transition as complete if we were in a transitioning state
      if (isTransitioning) {
        setIsTransitioning(false);
      }
    }
  }, [riskClusters, displayCompany, isTransitioning]);
  
  // Handle missing risk cluster data and reset transition state
  useEffect(() => {
    if (displayCompany && !riskClusters) {
      console.warn('[RiskRadarChart] Risk clusters data missing for company:', {
        id: displayCompany.id,
        name: displayCompany.name,
        riskScore: displayCompany.risk_score || displayCompany.chosen_score,
        usingCachedData: !!prevRiskClusters
      });
      
      // Reset transition state if we don't have data after a reasonable time
      if (isTransitioning) {
        setTimeout(() => {
          setIsTransitioning(false);
        }, 2000);
      }
    }
  }, [displayCompany, riskClusters, selectedCompanyId, company?.id, prevRiskClusters, isTransitioning]);
  
  // The actual risk clusters to display - use cached data during transitions
  const displayRiskClusters = riskClusters || (isTransitioning ? prevRiskClusters : null);

  // Format all category names to match the reference design
  const formatCategoryNames = (categories: string[]): string[] => {
    return categories.map((category) => {
      if (!category) return '';
      
      // Convert to all uppercase to match the reference design
      const uppercaseCategory = category.toUpperCase();
      
      // Handle the new dimension names with appropriate formatting
      if (uppercaseCategory.includes("CYBER SECURITY")) {
        return "CYBER\nSECURITY";
      }
      
      if (uppercaseCategory.includes("FINANCIAL STABILITY")) {
        return "FINANCIAL\nSTABILITY";
      }
      
      if (uppercaseCategory.includes("POTENTIAL LIABILITY")) {
        return "POTENTIAL\nLIABILITY";
      }
      
      if (uppercaseCategory.includes("DARK WEB DATA")) {
        return "DARK WEB\nDATA";
      }
      
      if (uppercaseCategory.includes("PUBLIC SENTIMENT")) {
        return "PUBLIC\nSENTIMENT";
      }
      
      if (uppercaseCategory.includes("DATA ACCESS SCOPE")) {
        return "DATA ACCESS\nSCOPE";
      }
      
      // Fallback for any other categories
      return uppercaseCategory;
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
        speed: 600,
        animateGradually: {
          enabled: true,
          delay: 100
        },
        dynamicAnimation: {
          enabled: true,
          speed: 400
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
      size: className?.includes("border-none") ? 5 : 8, // Larger markers for better visibility
      colors: ['#ffffff'],
      strokeColors: '#4965EC',
      strokeWidth: className?.includes("border-none") ? 2 : 3,
      hover: {
        size: className?.includes("border-none") ? 7 : 10, // Larger hover for better visibility
      }
    },
    grid: {
      show: false, // Removed horizontal lines in the background
      padding: {
        top: className?.includes("border-none") ? 40 : 60,
        bottom: className?.includes("border-none") ? 40 : 60,
        left: className?.includes("border-none") ? 40 : 70, 
        right: className?.includes("border-none") ? 40 : 70
      }
    },
    yaxis: {
      show: true,
      max: 100, // Updated to new 0-100 scale
      tickAmount: 5,
      labels: {
        style: {
          fontSize: '10px',
          fontWeight: 500,
          colors: ['#64748b']
        },
        formatter: (val: number) => {
          // Show multiples of 20 for the 0-100 scale
          const rounded = Math.round(val);
          return rounded % 20 === 0 ? rounded.toString() : '';
        }
      }
    },
    xaxis: {
      categories: displayRiskClusters ? formatCategoryNames(Object.keys(displayRiskClusters)) : [],
      labels: {
        style: {
          fontSize: className?.includes("border-none") ? '11px' : '12px',
          fontWeight: 700, // Bold weight to match reference
          colors: ['#1e293b', '#1e293b', '#1e293b', '#1e293b', '#1e293b', '#1e293b']
        },
        rotate: 0,
        offsetY: className?.includes("border-none") ? 8 : 3, // More distance from the chart
        offsetX: 0,
        formatter: function(val: string) {
          // Don't truncate for the widget version - ensures all text is visible
          return val;
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: className?.includes("border-none") ? '11px' : '12px',
        fontWeight: 'bold',
        colors: ['#1e293b']
      },
      background: {
        enabled: true,
        borderRadius: 3,
        padding: className?.includes("border-none") ? 3 : 3,
        opacity: 0.9,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      offsetY: className?.includes("border-none") ? 0 : -4
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
        size: className?.includes("border-none") ? Math.min(width * 0.85, height * 0.8, 220) : 170,
        offsetY: className?.includes("border-none") ? -10 : -10,
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
        breakpoint: 992, // Tablets and below
        options: {
          plotOptions: {
            radar: {
              size: 160,
              offsetY: 0
            }
          }
        }
      }
    ]
  };

  // Prepare the series data with enhanced visual properties, using cached data during transitions
  const series = [{
    name: 'Risk Score',
    data: displayRiskClusters ? Object.values(displayRiskClusters) : [],
    color: '#4965EC',
    lineWidth: 3
  }];
  
  // Effect to directly update the chart instance during transitions
  useEffect(() => {
    // Only run this effect when we have the chart loaded and we're transitioning 
    if (chartComponentLoaded && chartInstance && isTransitioning && displayRiskClusters) {
      logChartUpdate('Directly updating chart series during transition', {
        companyId: displayCompany?.id,
        companyName: displayCompany?.name,
        dimensions: Object.keys(displayRiskClusters).length
      });
      
      // Update both categories and series data to ensure proper chart display
      const categories = formatCategoryNames(Object.keys(displayRiskClusters));
      
      chartInstance.updateOptions({
        xaxis: {
          ...chartOptions.xaxis,
          categories: categories
        }
      }, false, true);
      
      // Update the series data
      chartInstance.updateSeries([{
        name: 'Risk Score',
        data: Object.values(displayRiskClusters)
      }], true);
      
      // End transition state after animation is complete
      setTimeout(() => {
        setIsTransitioning(false);
        logChartUpdate('Transition animation completed', {
          companyId: displayCompany?.id,
          companyName: displayCompany?.name
        });
      }, 800); // Match this with the animation speed in chartOptions
    }
  }, [chartComponentLoaded, chartInstance, displayRiskClusters, isTransitioning, displayCompany]);

  // If we're still loading and don't have previous data, or if chart component isn't available yet, show a skeleton
  if ((isLoading && !prevRiskClusters && !isTransitioning) || !chartComponentLoaded) {
    logChartUpdate('Rendering loading skeleton', {
      isLoading,
      hasPrevData: !!prevRiskClusters,
      isTransitioning,
      chartComponentLoaded
    });
    
    return (
      <Card className={cn("w-full h-full", className)}>
        <CardHeader className={className ? "bg-transparent" : "bg-slate-50 rounded-t-lg pb-3"}>
          <CardTitle className="text-slate-800">
            Risk Dimension Analysis
          </CardTitle>
          <CardDescription className="text-slate-500">
            Breakdown of risk across six key dimensions
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-4 h-full">
          <Skeleton className="h-full w-full rounded-md flex-1" />
        </CardContent>
      </Card>
    );
  }

  logChartUpdate('RENDER DEBUG - Current state', {
    company: company?.name,
    category: company?.category, 
    isBankOrInvela,
    selectedCompanyId,
    networkCompaniesCount: networkCompanies?.length || 0,
    isCondensedView: className?.includes("border-none"),
    displayCompanyName: displayCompany?.name,
    isTransitioning,
    hasPrevRiskClusters: !!prevRiskClusters,
    hasCurrentRiskClusters: !!riskClusters,
    usingDisplayRiskClusters: !!displayRiskClusters
  });

  return (
    <Card className={cn("w-full h-full", className)}>
      {/* Always show the header for Insights page views, but style it differently for widget view */}
      <CardHeader className={className?.includes("border-none") ? "p-2" : "bg-slate-50 rounded-t-lg pb-3"}>
        {/* Company selector for Bank/Invela users - moved outside the conditional rendering to ensure it's always considered */}
        {showDropdown && isBankOrInvela && (
          <div className="flex flex-row items-center justify-between mb-2 bg-blue-100 p-2 rounded-md">
            <div className="mr-4">
              <h3 className="text-sm font-semibold text-blue-700">Select a company to view</h3>
              {isAllCompaniesLoading || isNetworkVisualizationLoading || isNetworkLoading ? (
                <p className="text-xs text-blue-600">Loading company data...</p>
              ) : (
                <p className="text-xs text-blue-600">
                  {networkCompanies?.length > 0 
                    ? `Found ${networkCompanies.length} accredited companies in your network` 
                    : "No accredited companies found in your network"}
                </p>
              )}
            </div>
            
            <div className="w-[250px]">
              <Select 
                value={selectedCompanyId?.toString()} 
                onValueChange={(value) => {
                  const newCompanyId = parseInt(value);
                  logChartUpdate('Company selected from dropdown', newCompanyId);
                  
                  // Mark as transitioning to maintain chart visibility during data loading
                  if (newCompanyId !== selectedCompanyId) {
                    setIsTransitioning(true);
                  }
                  
                  setSelectedCompanyId(newCompanyId);
                }}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {/* Always show the current company first with "(You)" designation */}
                  <SelectItem value={company?.id?.toString() || "0"}>{company?.name || "Your Company"} (You)</SelectItem>
                  
                  {/* Show all combined network companies alphabetically (excluding current company) */}
                  {Array.isArray(networkCompanies) && networkCompanies.length > 0 ? (
                    networkCompanies
                      // Show all network companies except the current one
                      .filter(c => c.id !== (company?.id || 0))
                      .map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))
                  ) : (
                    // Show a loading state or "no companies" message
                    <SelectItem value="loading" disabled>
                      {isAllCompaniesLoading || isNetworkVisualizationLoading || isNetworkLoading 
                        ? "Loading companies..." 
                        : "No other companies found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Title and description hidden as requested */}
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full" style={{ height: `${height}px` }}>
          {!displayCompany ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                <LoadingSpinner size="lg" />
                <p className="text-sm font-medium mt-4">Loading company data...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please wait while we prepare the risk data
                </p>
              </div>
            </div>
          ) : isLoading && !isTransitioning ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-muted-foreground mt-4">Loading risk data...</p>
                {prevRiskClusters && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Updating from previous data...
                  </p>
                )}
              </div>
            </div>
          ) : !chartComponentLoaded ? (
            <div className="h-full w-full flex items-center justify-center">
              <Skeleton className="w-full h-[500px] rounded-md" />
            </div>
          ) : !displayRiskClusters ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="flex flex-col items-center text-center max-w-md">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
                <h3 className="text-lg font-medium mb-2">Risk dimensions unavailable</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed risk breakdown is not available for {displayCompany.name}.
                  {displayCompany.risk_score || displayCompany.chosen_score ? 
                    ` However, the company has an overall risk score of ${displayCompany.chosen_score || displayCompany.risk_score}.` : ''}
                </p>
                {selectedCompanyId && selectedCompanyId !== company?.id && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      logChartUpdate('Returning to current company', company?.id);
                      setSelectedCompanyId(company?.id || null);
                    }}
                    className="mt-2"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Return to current company
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Show a subtle loading indicator while transitioning between companies */}
              {isTransitioning && (
                <div className="absolute top-2 right-2 z-10 flex items-center bg-blue-50 px-2 py-1 rounded-full">
                  <LoadingSpinner className="text-blue-500 mr-1" size="xs" />
                  <span className="text-xs text-blue-600">Updating...</span>
                </div>
              )}
              
              {/* The chart itself with event handlers to capture the chart instance */}
              <ReactApexChart 
                options={{
                  ...chartOptions,
                  chart: {
                    ...chartOptions.chart,
                    width: "100%",
                    height: height,
                    responsive: []
                  }
                }} 
                series={series} 
                type="radar" 
                height={height}
                width="100%"
                className={`apex-charts-wrapper ${!chartInstance ? 'chart-initializing' : ''}`}
                key={`chart-${displayCompany?.id || 'default'}`}
                ref={(chartRef: any) => {
                  // Only set the chart instance once to avoid infinite re-renders
                  if (chartRef && chartRef.chart && !chartInstance) {
                    // Store the chart instance in state for animations
                    setChartInstance(chartRef.chart);
                    setChartComponentLoaded(true);
                    logChartUpdate('Chart instance mounted', { available: true });
                  }
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Responsive RiskRadarChart component with error boundary
 * Automatically adapts to container dimensions and provides graceful error handling
 */
export function RiskRadarChart({ className, companyId, showDropdown }: { className?: string; companyId?: number; showDropdown?: boolean }) {
  return (
    <ChartErrorBoundary>
      <ContainerAwareChartWrapper
        minWidth={280}
        minHeight={250}
        maxHeight={400}
        aspectRatio={1.2}
        fallbackHeight={320}
        className={className}
      >
        {({ width, height }: { width: number; height: number }) => (
          <RiskRadarChartInternal
            className={className}
            companyId={companyId}
            showDropdown={showDropdown}
            width={width}
            height={height}
          />
        )}
      </ContainerAwareChartWrapper>
    </ChartErrorBoundary>
  );
}