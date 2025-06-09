/**
 * ========================================
 * Network Scatter Plot Insight - Intelligent Grouping
 * ========================================
 * 
 * Advanced scatter plot visualization showing company positioning across
 * risk score and revenue dimensions with intelligent clustering algorithms.
 * Features interactive grouping, zoom capabilities, and multi-dimensional filtering.
 * 
 * Key Features:
 * - X-axis: Risk Score (0-100)
 * - Y-axis: Revenue Tier (1-5) 
 * - Color coding: Company Type (Bank, FinTech, Invela)
 * - Size: Number of active relationships
 * - Clustering: K-means algorithm for natural groupings
 * - Interactive tooltips with company details
 * - Zoom and pan capabilities
 * - Advanced filtering options
 * 
 * @module components/insights/NetworkScatterPlotInsight
 * @version 1.0.0
 * @since 2025-06-09
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Loader2, Filter, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScatterPlotNode {
  id: number;
  name: string;
  riskScore: number;
  revenueTier: number;
  category: string;
  accreditationStatus: string;
  relationshipCount: number;
  x?: number;
  y?: number;
  cluster?: number;
}

interface ScatterPlotFilters {
  companyTypes: string[];
  accreditationStatus: string[];
  riskRange: [number, number];
  revenueRange: [number, number];
}

interface NetworkScatterPlotInsightProps {
  className?: string;
}

const companyTypeColors = {
  'Bank': '#8A4FE0',
  'FinTech': '#48BB78', 
  'Invela': '#4965EC',
  'Default': '#64748b'
};

const clusterColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

export function NetworkScatterPlotInsight({ className }: NetworkScatterPlotInsightProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewMode, setViewMode] = useState<'companies' | 'clusters'>('companies');
  const [showClusters, setShowClusters] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filters, setFilters] = useState<ScatterPlotFilters>({
    companyTypes: [],
    accreditationStatus: [],
    riskRange: [0, 100],
    revenueRange: [1, 5]
  });

  // Fetch companies with risk data
  const { data: companies, isLoading } = useQuery<any[]>({
    queryKey: ['/api/companies-with-risk'],
    enabled: true
  });

  // Process and filter data
  const processedData = useMemo(() => {
    if (!companies) return [];
    
    return companies
      .filter(company => {
        const matchesType = filters.companyTypes.length === 0 || 
          filters.companyTypes.includes(company.category);
        const matchesAccreditation = filters.accreditationStatus.length === 0 || 
          filters.accreditationStatus.includes(company.accreditationStatus);
        const matchesRisk = company.riskScore >= filters.riskRange[0] && 
          company.riskScore <= filters.riskRange[1];
        const matchesRevenue = company.revenueTier >= filters.revenueRange[0] && 
          company.revenueTier <= filters.revenueRange[1];
        
        return matchesType && matchesAccreditation && matchesRisk && matchesRevenue;
      })
      .map(company => ({
        id: company.id,
        name: company.name,
        riskScore: company.riskScore || 0,
        revenueTier: company.revenueTier || 1,
        category: company.category,
        accreditationStatus: company.accreditationStatus,
        relationshipCount: company.relationshipCount || 1
      }));
  }, [companies, filters]);

  // K-means clustering algorithm
  const clusteredData = useMemo(() => {
    if (processedData.length < 3) return processedData;

    const k = Math.min(5, Math.ceil(processedData.length / 10)); // Dynamic cluster count
    const points = processedData.map(d => [d.riskScore, d.revenueTier]);
    
    // Simple k-means implementation
    let centroids = [];
    for (let i = 0; i < k; i++) {
      centroids.push([
        Math.random() * 100,
        Math.random() * 4 + 1
      ]);
    }

    // Iterate to find optimal centroids
    for (let iteration = 0; iteration < 10; iteration++) {
      const clusters = Array(k).fill(null).map(() => []);
      
      points.forEach((point, index) => {
        let closestCentroid = 0;
        let minDistance = Infinity;
        
        centroids.forEach((centroid, cIndex) => {
          const distance = Math.sqrt(
            Math.pow(point[0] - centroid[0], 2) + 
            Math.pow(point[1] - centroid[1], 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = cIndex;
          }
        });
        
        clusters[closestCentroid].push(index);
      });

      // Update centroids
      centroids = clusters.map(cluster => {
        if (cluster.length === 0) return [Math.random() * 100, Math.random() * 4 + 1];
        const sumX = cluster.reduce((sum, idx) => sum + points[idx][0], 0);
        const sumY = cluster.reduce((sum, idx) => sum + points[idx][1], 0);
        return [sumX / cluster.length, sumY / cluster.length];
      });
    }

    // Assign cluster IDs to data
    const result = processedData.map((item, index) => {
      let cluster = 0;
      let minDistance = Infinity;
      
      centroids.forEach((centroid, cIndex) => {
        const distance = Math.sqrt(
          Math.pow(item.riskScore - centroid[0], 2) + 
          Math.pow(item.revenueTier - centroid[1], 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          cluster = cIndex;
        }
      });
      
      return { ...item, cluster };
    });

    return result;
  }, [processedData]);

  // D3 Visualization
  useEffect(() => {
    if (!svgRef.current || !clusteredData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.bottom - margin.top;

    const container = svg
      .attr('viewBox', `0 0 ${800} ${500}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([1, 5])
      .range([height, 0]);

    const sizeScale = d3.scaleSqrt()
      .domain([1, d3.max(clusteredData, d => d.relationshipCount) || 10])
      .range([4, 20]);

    // Axes
    container.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Risk Score');

    container.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `Tier ${d}`))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Revenue Tier');

    // Grid lines
    container.append('g')
      .selectAll('line')
      .data(xScale.ticks())
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5);

    container.append('g')
      .selectAll('line')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5);

    // Cluster background areas (if enabled)
    if (showClusters && viewMode === 'clusters') {
      const clusters = d3.group(clusteredData, d => d.cluster);
      
      clusters.forEach((clusterData, clusterId) => {
        if (clusterData.length < 3) return;
        
        const hull = d3.polygonHull(
          clusterData.map(d => [xScale(d.riskScore), yScale(d.revenueTier)])
        );
        
        if (hull) {
          container.append('path')
            .datum(hull)
            .attr('d', d3.line()
              .x(d => d[0])
              .y(d => d[1])
              .curve(d3.curveCatmullRomClosed))
            .attr('fill', clusterColors[clusterId % clusterColors.length])
            .attr('fill-opacity', 0.1)
            .attr('stroke', clusterColors[clusterId % clusterColors.length])
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.3);
        }
      });
    }

    // Data points
    const circles = container.selectAll('.data-point')
      .data(clusteredData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.riskScore))
      .attr('cy', d => yScale(d.revenueTier))
      .attr('r', d => sizeScale(d.relationshipCount))
      .attr('fill', d => {
        if (viewMode === 'clusters') {
          return clusterColors[d.cluster % clusterColors.length];
        }
        return companyTypeColors[d.category] || companyTypeColors.Default;
      })
      .attr('stroke', d => d.accreditationStatus === 'APPROVED' ? '#22c55e' : 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer');

    // Tooltips
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'scatter-tooltip')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    circles
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 3);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <strong>${d.name}</strong><br/>
          Risk Score: ${d.riskScore}<br/>
          Revenue Tier: ${d.revenueTier}<br/>
          Category: ${d.category}<br/>
          Relationships: ${d.relationshipCount}<br/>
          Status: ${d.accreditationStatus}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 2);
        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${800 - 100}, 30)`);

    if (viewMode === 'companies') {
      const categories = ['Bank', 'FinTech', 'Invela'];
      categories.forEach((category, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('circle')
          .attr('r', 8)
          .attr('fill', companyTypeColors[category]);
        
        legendRow.append('text')
          .attr('x', 15)
          .attr('y', 4)
          .style('font-size', '12px')
          .text(category);
      });
    }

    return () => {
      d3.selectAll('.scatter-tooltip').remove();
    };
  }, [clusteredData, viewMode, showClusters]);

  const toggleFilter = (filterType: keyof ScatterPlotFilters, value: any) => {
    setFilters(prev => {
      if (Array.isArray(prev[filterType])) {
        const currentArray = prev[filterType] as any[];
        const newArray = currentArray.includes(value)
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value];
        return { ...prev, [filterType]: newArray };
      }
      return prev;
    });
  };

  const resetFilters = () => {
    setFilters({
      companyTypes: [],
      accreditationStatus: [],
      riskRange: [0, 100],
      revenueRange: [1, 5]
    });
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full h-[600px] flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Network Scatter Plot Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
              <ToggleGroupItem value="companies">Companies</ToggleGroupItem>
              <ToggleGroupItem value="clusters">Clusters</ToggleGroupItem>
            </ToggleGroup>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Company Types</DropdownMenuLabel>
                {['Bank', 'FinTech', 'Invela'].map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.companyTypes.includes(type)}
                    onCheckedChange={() => toggleFilter('companyTypes', type)}
                  >
                    {type}
                  </DropdownMenuCheckboxItem>
                ))}
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Accreditation</DropdownMenuLabel>
                {['APPROVED', 'PENDING', 'REJECTED'].map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.accreditationStatus.includes(status)}
                    onCheckedChange={() => toggleFilter('accreditationStatus', status)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
                
                <DropdownMenuSeparator />
                <Button onClick={resetFilters} variant="ghost" size="sm" className="w-full">
                  Reset Filters
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClusters(!showClusters)}
            >
              {showClusters ? 'Hide' : 'Show'} Clusters
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Companies positioned by risk score and revenue tier. Size indicates relationship count.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full h-[500px] flex items-center justify-center">
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ maxHeight: '500px' }}
          />
        </div>
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Showing {clusteredData.length} companies • Green borders indicate approved accreditation
        </div>
      </CardContent>
    </Card>
  );
}