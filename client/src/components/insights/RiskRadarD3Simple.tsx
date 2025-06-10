import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCurrentCompany } from '@/hooks/use-current-company';
import { InsightLoadingSkeleton } from './InsightLoadingSkeleton';
import { StandardizedDropdown } from './shared/StandardizedDropdown';
import { StandardizedTimeSelector } from './shared/StandardizedTimeSelector';
import { INSIGHT_COLORS, INSIGHT_ANIMATIONS } from '@/lib/insightDesignSystem';

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

    const size = 380;
    const margin = 50;
    const radius = (size - margin * 2) / 2;
    const centerX = size / 2;
    const centerY = size / 2;

    svg.attr('width', size).attr('height', size);

    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Scales
    const angleScale = d3.scaleLinear()
      .domain([0, chartData.length])
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 100])
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
        .text((100 / levels) * i);
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

    // Data area without animation
    g.append('path')
      .datum(chartData)
      .attr('fill', '#4965EC')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#4965EC')
      .attr('stroke-width', 2)
      .attr('d', line);

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
          .html(`<strong>${d.category}</strong><br/>Score: ${d.value}/100`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);
        
        tooltip.style('opacity', 0);
      })
      .transition()
      .delay((d, i) => i * 100)
      .duration(300)
      .attr('r', 4);

    // Labels with line wrapping (no animation)
    chartData.forEach((d, i) => {
      const angle = angleScale(i) - Math.PI / 2;
      const labelRadius = radius + 20;
      const x = Math.cos(angle) * labelRadius;
      const y = Math.sin(angle) * labelRadius;
      
      // Split category name for line wrapping (max 2 lines)
      const words = d.category.split(' ');
      const labelGroup = g.append('g')
        .attr('transform', `translate(${x}, ${y})`);
      
      if (words.length > 1) {
        // Multi-line labels (limit to 2 lines)
        const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
        
        labelGroup.append('text')
          .attr('x', 0)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .attr('fill', '#374151')
          .text(firstLine);
          
        if (secondLine) {
          labelGroup.append('text')
            .attr('x', 0)
            .attr('y', 6)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', '#374151')
            .text(secondLine);
        }
      } else {
        // Single line labels
        labelGroup.append('text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .attr('fill', '#374151')
          .text(d.category);
      }
    });

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
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">No current data found</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-1 pt-3">
        {showDropdown && companiesWithClusters.length > 1 && (
          <div className="flex justify-center">
            <Select 
              value={selectedCompanyId?.toString() || ''} 
              onValueChange={(value) => setSelectedCompanyId(Number(value))}
            >
              <SelectTrigger className="w-64 h-8 text-sm">
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
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-1 pb-2">
        <div className="flex justify-center items-center">
          <div className="relative">
            <svg ref={svgRef} style={{ display: 'block' }} />
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 transition-opacity duration-200 z-50"
              style={{ position: 'absolute' }}
            />
          </div>
        </div>
        

      </CardContent>
    </Card>
  );
}