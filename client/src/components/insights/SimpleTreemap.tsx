import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';

interface CompanyData {
  id: number;
  name: string;
  category: string;
  revenue_tier: string;
  risk_score: number;
}

interface TreemapNode {
  name: string;
  value: number;
  category: string;
  revenue_tier: string;
  risk_score: number;
}

export default function SimpleTreemap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fetch network data
  const { data: networkData } = useQuery({
    queryKey: ['/api/relationships/network'],
  });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: rect.height || 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render treemap
  useEffect(() => {
    if (!networkData?.nodes || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Transform data for treemap
    const treeData = networkData.nodes.map((node: any) => ({
      name: node.name,
      value: getRevenueValue(node.revenueTier),
      category: node.category,
      revenue_tier: node.revenueTier,
      risk_score: node.riskScore,
    }));

    // Create hierarchy
    const root = d3.hierarchy({ children: treeData } as any)
      .sum((d: any) => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3.treemap()
      .size([dimensions.width, dimensions.height])
      .padding(2);

    treemap(root);

    // Color function
    const getColor = (category: string) => {
      if (category === 'Bank') return '#3B82F6';
      if (category === 'FinTech') return '#10B981';
      if (category === 'Invela') return '#8B5CF6';
      return '#6B7280';
    };

    // Create rectangles
    const leaves = svg.selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g');

    const rects = leaves.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => getColor(d.data.category))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    // Add text labels
    leaves.append('text')
      .attr('x', d => (d.x0 + d.x1) / 2)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', '#ffffff')
      .style('font-size', d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        return Math.min(width / 8, height / 4, 12) + 'px';
      })
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .text(d => {
        const width = d.x1 - d.x0;
        return width > 60 ? d.data.name : '';
      });

  }, [networkData, dimensions]);

  // Helper function to get revenue value
  function getRevenueValue(revenueTier: string): number {
    switch (revenueTier?.toLowerCase()) {
      case 'large': return 100;
      case 'medium': return 50;
      case 'small': return 25;
      default: return 10;
    }
  }

  return (
    <div className="w-full h-full bg-white">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}