import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCurrentCompany } from '@/hooks/use-current-company';

interface RiskClusters {
  'Cyber Security': number;
  'Financial Stability': number;
  'Potential Liability': number;
  'Dark Web Data': number;
  'Public Sentiment': number;
  'Data Access Scope': number;
}

interface CompanyWithRiskClusters {
  id: number;
  name: string;
  category: string;
  risk_score: number;
  risk_clusters?: RiskClusters;
}

interface RiskRadarD3SimpleProps {
  className?: string;
  companyId?: number;
  showDropdown?: boolean;
}

export function RiskRadarD3Simple({ 
  className, 
  companyId,
  showDropdown = true
}: RiskRadarD3SimpleProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { company } = useCurrentCompany();
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

  // Get companies data for dropdown
  const { data: allCompaniesData = [] } = useQuery<CompanyWithRiskClusters[]>({
    queryKey: ['/api/companies-with-risk'],
    queryFn: async () => {
      const response = await fetch('/api/companies-with-risk');
      if (!response.ok) {
        throw new Error('Failed to fetch companies with risk data');
      }
      return response.json();
    },
    enabled: showDropdown && isBankOrInvela && !!company?.id,
    staleTime: 30000,
    gcTime: 300000
  });

  // Find the selected company
  const displayCompany = React.useMemo(() => {
    if (selectedCompanyId) {
      const foundCompany = allCompaniesData.find(c => c.id === selectedCompanyId);
      if (foundCompany) return foundCompany;
    }
    
    // Fallback to current company or BankingAPI Gateway
    if (company) return company;
    return allCompaniesData.find(c => c.id === 459) || allCompaniesData[0];
  }, [selectedCompanyId, allCompaniesData, company]);

  // Transform risk clusters to chart data
  const chartData = React.useMemo(() => {
    const companyWithClusters = displayCompany as CompanyWithRiskClusters;
    if (!companyWithClusters?.risk_clusters) {
      return null;
    }

    return Object.entries(companyWithClusters.risk_clusters).map(([category, value]) => ({
      category,
      value: Number(value) || 0
    }));
  }, [displayCompany]);

  useEffect(() => {
    if (!svgRef.current || !chartData?.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 300;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Scales
    const angleScale = d3.scaleLinear()
      .domain([0, chartData.length])
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 10])
      .range([0, radius]);

    // Grid circles with labels
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      g.append('circle')
        .attr('r', (radius / levels) * i)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
      
      // Grid value labels
      g.append('text')
        .attr('x', 5)
        .attr('y', -(radius / levels) * i)
        .attr('font-size', '8px')
        .attr('fill', '#64748b')
        .text((10 / levels) * i);
    }

    // Grid lines
    chartData.forEach((d, i) => {
      const angle = angleScale(i) - Math.PI / 2;
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', Math.cos(angle) * radius)
        .attr('y2', Math.sin(angle) * radius)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
    });

    // Tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Data line
    const line = d3.line<{ category: string; value: number }>()
      .x((d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * radiusScale(d.value);
      })
      .y((d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * radiusScale(d.value);
      })
      .curve(d3.curveLinearClosed);

    // Data area with animation
    const path = g.append('path')
      .datum(chartData)
      .attr('fill', '#4965EC')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#4965EC')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Animate the path
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', totalLength + ' ' + totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .attr('stroke-dashoffset', 0);

    // Data points with interactions
    g.selectAll('.dot')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * radiusScale(d.value);
      })
      .attr('cy', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * radiusScale(d.value);
      })
      .attr('r', 0)
      .attr('fill', '#4965EC')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6);
        
        tooltip
          .style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`<strong>${d.category}</strong><br/>Score: ${d.value}/10`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);
        
        tooltip.style('opacity', 0);
      })
      .transition()
      .delay((d, i) => i * 200)
      .duration(500)
      .attr('r', 4);

    // Labels
    g.selectAll('.label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.cos(angle) * (radius + 20);
      })
      .attr('y', (d, i) => {
        const angle = angleScale(i) - Math.PI / 2;
        return Math.sin(angle) * (radius + 20);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#1e293b')
      .style('opacity', 0)
      .text(d => d.category)
      .transition()
      .delay((d, i) => i * 150 + 500)
      .duration(300)
      .style('opacity', 1);

  }, [chartData]);

  // Filter companies with risk clusters for dropdown
  const companiesWithClusters = React.useMemo(() => {
    return allCompaniesData.filter(company => 
      company.risk_clusters && 
      Object.keys(company.risk_clusters).length > 0
    );
  }, [allCompaniesData]);

  if (!chartData) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Risk Radar (D3 Interactive)</CardTitle>
          <p className="text-sm text-muted-foreground">No risk cluster data available</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            <p>No risk cluster data available for this company</p>
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
            <CardTitle className="text-base font-semibold">Risk Radar (D3 Interactive)</CardTitle>
            <p className="text-sm text-muted-foreground">
              {displayCompany?.name || 'No company selected'} - Risk Assessment
            </p>
          </div>
          {showDropdown && companiesWithClusters.length > 1 && (
            <Select 
              value={selectedCompanyId?.toString() || ''} 
              onValueChange={(value) => setSelectedCompanyId(Number(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companiesWithClusters.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          <svg ref={svgRef} className="w-full h-auto" />
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 transition-opacity duration-200 z-50"
            style={{ position: 'absolute' }}
          />
        </div>
        
        {displayCompany && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Risk Score:</span>
                <span className="ml-2 text-blue-600">{displayCompany.risk_score}/10</span>
              </div>
              <div>
                <span className="font-medium">Category:</span>
                <span className="ml-2">{displayCompany.category}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}