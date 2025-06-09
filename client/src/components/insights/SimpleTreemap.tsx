import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';

interface CompanyData {
  id: number;
  name: string;
  category: string;
  revenue_tier: string;
  risk_score: number;
  num_employees?: number;
  accreditation_status?: string;
}

interface TreemapNode {
  name: string;
  value: number;
  category: string;
  revenue_tier: string;
  risk_score: number;
  num_employees?: number;
  accreditation_status?: string;
}

export default function SimpleTreemap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);

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
      num_employees: node.numEmployees || (node.revenueTier === 'large' ? 500 : node.revenueTier === 'medium' ? 150 : 50),
      accreditation_status: node.accreditationStatus,
    }));

    // Create hierarchy
    const root = d3.hierarchy({ children: treeData } as any)
      .sum((d: any) => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout - ensure all data fits in one view
    const treemap = d3.treemap()
      .size([dimensions.width, dimensions.height])
      .padding(1)
      .paddingInner(1);

    treemap(root);

    // Enhanced color function with gradients based on revenue tiers
    const getColor = (category: string, revenueTier: string) => {
      const baseColors = {
        'Bank': '#2563EB',     // Blue
        'FinTech': '#059669',  // Green
        'Invela': '#7C3AED',   // Purple
        'Default': '#4B5563'   // Gray
      };
      
      const base = baseColors[category as keyof typeof baseColors] || baseColors.Default;
      
      // Create different shades based on revenue tier
      if (revenueTier === 'large') return base;
      if (revenueTier === 'medium') return base + '99'; // Add opacity
      return base + '66'; // Lighter shade for small
    };

    // Mouse event handlers
    const handleMouseOver = (event: any, d: any) => {
      setHoveredNode(d.data);
      
      // Fade out all other rectangles
      svg.selectAll('rect')
        .style('opacity', (rectData: any) => rectData === d ? 1 : 0.3);
      
      // Position tooltip
      if (tooltipRef.current) {
        const rect = svgRef.current!.getBoundingClientRect();
        tooltipRef.current.style.left = (event.clientX - rect.left + 10) + 'px';
        tooltipRef.current.style.top = (event.clientY - rect.top - 10) + 'px';
        tooltipRef.current.style.opacity = '1';
      }
    };

    const handleMouseOut = () => {
      setHoveredNode(null);
      
      // Restore opacity for all rectangles
      svg.selectAll('rect').style('opacity', 1);
      
      // Hide tooltip
      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
      }
    };

    // Create rectangles with hover interactions
    const leaves = svg.selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g');

    const rects = leaves.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => getColor(d.data.category, d.data.revenue_tier))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.2s ease')
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

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
        return Math.min(width / 10, height / 5, 10) + 'px';
      })
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .text(d => {
        const width = d.x1 - d.x0;
        return width > 50 ? d.data.name : '';
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

  // Helper function to get role type
  const getRoleType = (category: string) => {
    if (category === 'Bank') return 'Data Recipient';
    if (category === 'FinTech') return 'Data Provider';
    if (category === 'Invela') return 'Invela Platform';
    return 'Unknown';
  };

  // Helper function to format revenue tier
  const formatRevenueTier = (tier: string) => {
    if (!tier) return 'Not specified';
    return tier.charAt(0).toUpperCase() + tier.slice(1) + ' Revenue';
  };

  return (
    <div className="w-full h-full bg-white relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
      
      {/* Enhanced Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-50 bg-gray-900 text-white p-4 rounded-lg shadow-xl pointer-events-none opacity-0 transition-opacity duration-200 min-w-[280px]"
        style={{ maxWidth: '320px' }}
      >
        {hoveredNode && (
          <div className="space-y-3">
            {/* Company Name */}
            <div className="font-bold text-lg border-b border-gray-600 pb-2">
              {hoveredNode.name}
            </div>
            
            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Category</div>
                <div className="font-medium">{hoveredNode.category}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Role</div>
                <div className="font-medium">{getRoleType(hoveredNode.category)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Revenue Tier</div>
                <div className="font-medium text-green-400">{formatRevenueTier(hoveredNode.revenue_tier)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Company Size</div>
                <div className="font-medium">{hoveredNode.num_employees?.toLocaleString() || 'N/A'} employees</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Risk Score</div>
                <div className="font-medium">{hoveredNode.risk_score || 'N/A'}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Status</div>
                <div className="font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    hoveredNode.accreditation_status === 'APPROVED' 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {hoveredNode.accreditation_status || 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}