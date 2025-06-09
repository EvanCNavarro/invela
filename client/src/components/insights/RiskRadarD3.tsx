import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
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
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

interface RiskRadarD3Props {
  className?: string;
  companyId?: number;
  showDropdown?: boolean;
  width?: number;
  height?: number;
}

function RiskRadarD3Internal({ 
  className, 
  companyId, 
  showDropdown = true, 
  width = 300, 
  height = 300 
}: RiskRadarD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { company, isLoading: isCompanyLoading } = useCurrentCompany();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

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

  // Transform risk clusters data for D3
  const chartData = React.useMemo(() => {
    if (!riskClusters) return [];
    
    return Object.entries(riskClusters).map(([key, value]) => ({
      category: formatCategoryName(key),
      value: value
    }));
  }, [riskClusters]);

  // Format category names for display
  const formatCategoryName = (category: string): string => {
    const uppercaseCategory = category.toUpperCase();
    
    if (uppercaseCategory.includes("CYBER SECURITY")) return "CYBER SECURITY";
    if (uppercaseCategory.includes("FINANCIAL STABILITY")) return "FINANCIAL STABILITY";
    if (uppercaseCategory.includes("POTENTIAL LIABILITY")) return "POTENTIAL LIABILITY";
    if (uppercaseCategory.includes("DARK WEB DATA")) return "DARK WEB DATA";
    if (uppercaseCategory.includes("PUBLIC SENTIMENT")) return "PUBLIC SENTIMENT";
    if (uppercaseCategory.includes("DATA ACCESS SCOPE")) return "DATA ACCESS SCOPE";
    
    return uppercaseCategory;
  };

  // Get filtered companies for dropdown
  const filteredCompanies = React.useMemo(() => {
    return allCompaniesData.filter(company => {
      const hasRiskClusters = company.risk_clusters && Object.keys(company.risk_clusters).length > 0;
      const isApproved = company.accreditationStatus === 'APPROVED' || company.accreditation_status === 'APPROVED';
      return hasRiskClusters && isApproved;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCompaniesData]);

  // D3 radar chart rendering
  useEffect(() => {
    if (!svgRef.current || !chartData.length || !width || !height) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Define scales
    const angleScale = d3.scaleLinear()
      .domain([0, chartData.length])
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius * 0.8]);

    // Create radial grid
    const gridLevels = 5;
    for (let i = 1; i <= gridLevels; i++) {
      g.append('circle')
        .attr('r', (radius * 0.8 * i) / gridLevels)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
    }

    // Create axis lines
    chartData.forEach((d, i) => {
      const angle = angleScale(i) - Math.PI / 2;
      const x = Math.cos(angle) * radius * 0.8;
      const y = Math.sin(angle) * radius * 0.8;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
    });

    // Create gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('radialGradient')
      .attr('id', 'radarGradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#4965EC')
      .attr('stop-opacity', 0.6);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#4965EC')
      .attr('stop-opacity', 0.1);

    // Create radar area path
    const radarLine = d3.lineRadial()
      .angle((d, i) => angleScale(i))
      .radius(d => radiusScale(d.value))
      .curve(d3.curveLinearClosed);

    const radarArea = d3.areaRadial()
      .angle((d, i) => angleScale(i))
      .innerRadius(0)
      .outerRadius(d => radiusScale(d.value))
      .curve(d3.curveLinearClosed);

    // Add radar area with gradient
    g.append('path')
      .datum(chartData)
      .attr('d', radarArea)
      .attr('fill', 'url(#radarGradient)')
      .style('opacity', 0)
      .transition()
      .duration(800)
      .style('opacity', 1);

    // Add radar line
    g.append('path')
      .datum(chartData)
      .attr('d', radarLine)
      .attr('fill', 'none')
      .attr('stroke', '#4965EC')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', function() {
        const totalLength = this.getTotalLength();
        return totalLength + ' ' + totalLength;
      })
      .attr('stroke-dashoffset', function() {
        return this.getTotalLength();
      })
      .transition()
      .duration(1200)
      .attr('stroke-dashoffset', 0);

    // Add data points
    const dots = g.selectAll('.radar-dot')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('class', 'radar-dot')
      .attr('cx', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * radiusScale(d.value);
      })
      .attr('cy', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * radiusScale(d.value);
      })
      .attr('r', 0)
      .attr('fill', '#ffffff')
      .attr('stroke', '#4965EC')
      .attr('stroke-width', 2)
      .transition()
      .delay((d, i) => i * 100 + 400)
      .duration(300)
      .attr('r', 4);

    // Add labels
    chartData.forEach((d, i) => {
      const angle = angleScale(i) - Math.PI / 2;
      const labelRadius = radius * 0.9;
      const x = Math.cos(angle) * labelRadius;
      const y = Math.sin(angle) * labelRadius;

      g.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', '#1e293b')
        .style('opacity', 0)
        .text(d.category)
        .transition()
        .delay(800)
        .duration(400)
        .style('opacity', 1);
    });

    // Add value labels on hover
    dots.on('mouseenter', function(event, d) {
      const tooltip = g.append('text')
        .attr('class', 'value-tooltip')
        .attr('x', d3.select(this).attr('cx'))
        .attr('y', parseFloat(d3.select(this).attr('cy')) - 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1e293b')
        .attr('background', '#ffffff')
        .text(d.value);
    })
    .on('mouseleave', function() {
      g.select('.value-tooltip').remove();
    });

  }, [chartData, width, height]);

  const isLoading = isCompanyLoading || isAllCompaniesLoading;

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Risk Radar (D3)</CardTitle>
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

  if (!displayCompany || !riskClusters || Object.keys(riskClusters).length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Risk Radar (D3)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[280px]">
            <div className="text-center text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No risk cluster data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                {displayCompany?.name || 'Company'} does not have risk cluster analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Risk Radar (D3)</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Multi-dimensional risk assessment
            </CardDescription>
          </div>
          {showDropdown && isBankOrInvela && filteredCompanies.length > 0 && (
            <Select
              value={selectedCompanyId?.toString()}
              onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
            >
              <SelectTrigger className="w-48 bg-white border border-gray-200 shadow-sm hover:bg-gray-50">
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
        <div className="w-full h-[300px] flex justify-center items-center">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="overflow-visible"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskRadarD3({ className, companyId, showDropdown }: Omit<RiskRadarD3Props, 'width' | 'height'>) {
  return (
    <RiskRadarD3Internal
      className={className}
      companyId={companyId}
      showDropdown={showDropdown}
      width={300}
      height={300}
    />
  );
}