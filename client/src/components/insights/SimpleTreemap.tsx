import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { 
  INSIGHT_COLORS, 
  getCategoryColor, 
  getRiskColor, 
  getRevenueTierColor,
  getAccreditationColor 
} from '@/lib/insightDesignSystem';
import { InsightLoadingSkeleton } from './InsightLoadingSkeleton';

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
  const { data: networkData, refetch, isLoading } = useQuery({
    queryKey: ['/api/network/visualization'],
    refetchOnMount: true,
  });

  // Show standardized loading skeleton
  if (isLoading) {
    return <InsightLoadingSkeleton variant="network" animationDelay={0} />;
  }

  // Force refetch on component mount
  useEffect(() => {
    refetch();
  }, [refetch]);

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
    if (!networkData || !networkData.nodes || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Transform data for treemap
    const treeData = networkData.nodes.map((node: any) => {
      console.log('[SimpleTreemap] Raw node data:', {
        name: node.name,
        revenue: node.revenue,
        numEmployees: node.numEmployees,
        revenueTier: node.revenueTier,
        category: node.category
      });
      
      return {
        name: node.name,
        value: getRevenueValue(node.revenueTier || node.revenue_tier),
        category: node.category,
        revenue_tier: node.revenueTier || node.revenue_tier,
        revenue_value: node.revenue || node.revenueValue || 0,
        risk_score: node.riskScore || node.risk_score,
        num_employees: node.numEmployees || node.num_employees || 0,
        accreditation_status: node.accreditationStatus || node.accreditation_status,
      };
    });

    // Create hierarchy
    const root = d3.hierarchy({ children: treeData } as any)
      .sum((d: any) => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    console.log('[SimpleTreemap] Hierarchy created:', {
      childrenCount: treeData.length,
      leavesCount: root.leaves().length,
      dimensions: dimensions
    });

    // Create treemap layout - ensure all data fits in one view
    const treemap = d3.treemap()
      .size([dimensions.width, dimensions.height])
      .padding(1)
      .paddingInner(1);

    treemap(root);

    console.log('[SimpleTreemap] First few leaves:', root.leaves().slice(0, 3).map(d => ({
      name: d.data.name,
      value: d.data.value,
      x0: d.x0,
      y0: d.y0,
      x1: d.x1,
      y1: d.y1,
      width: d.x1 - d.x0,
      height: d.y1 - d.y0
    })));

    // Standardized color function using design system
    const getColor = (category: string, revenueTier: string) => {
      // Use design system for category colors first
      const categoryColor = getCategoryColor(category);
      
      // If we have a revenue tier, use the revenue tier color system
      if (revenueTier && revenueTier !== 'unknown') {
        return getRevenueTierColor(revenueTier);
      }
      
      // Fallback to category color
      return categoryColor;
    };

    // Mouse event handlers with smart tooltip positioning
    const handleMouseOver = (event: any, d: any) => {
      setHoveredNode(d.data);
      
      // Fade out all other rectangles
      svg.selectAll('rect')
        .style('opacity', (rectData: any) => rectData === d ? 1 : 0.3);
      
      // Smart tooltip positioning
      if (tooltipRef.current) {
        const svgRect = svgRef.current!.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left;
        const mouseY = event.clientY - svgRect.top;
        
        const tooltipWidth = 320; // Max width from CSS
        const tooltipHeight = 200; // Estimated height
        const padding = 15;
        
        // Calculate position based on available space
        let left = mouseX + padding;
        let top = mouseY - padding;
        
        // Check if tooltip would go off right edge
        if (left + tooltipWidth > dimensions.width) {
          left = mouseX - tooltipWidth - padding;
        }
        
        // Check if tooltip would go off bottom edge
        if (top + tooltipHeight > dimensions.height) {
          top = mouseY - tooltipHeight + padding;
        }
        
        // Check if tooltip would go off top edge
        if (top < 0) {
          top = mouseY + padding;
        }
        
        // Check if tooltip would go off left edge
        if (left < 0) {
          left = padding;
        }
        
        tooltipRef.current.style.left = left + 'px';
        tooltipRef.current.style.top = top + 'px';
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

    console.log('[SimpleTreemap] About to create rectangles for leaves:', leaves.size());

    const rects = leaves.append('rect')
      .attr('x', (d: any) => {
        console.log('[SimpleTreemap] Setting x position:', d.x0);
        return d.x0 || 0;
      })
      .attr('y', (d: any) => d.y0 || 0)
      .attr('width', (d: any) => {
        const width = (d.x1 || 0) - (d.x0 || 0);
        console.log('[SimpleTreemap] Setting width:', width);
        return Math.max(0, width);
      })
      .attr('height', (d: any) => {
        const height = (d.y1 || 0) - (d.y0 || 0);
        console.log('[SimpleTreemap] Setting height:', height);
        return Math.max(0, height);
      })
      .attr('fill', (d: any) => {
        const color = getColor(d.data?.category || 'Unknown', d.data?.revenue_tier || 'unknown');
        console.log('[SimpleTreemap] Setting color:', color, 'for category:', d.data?.category, 'tier:', d.data?.revenue_tier);
        return color;
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.2s ease')
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

    console.log('[SimpleTreemap] Created rectangles:', rects.size());

    // Enhanced text labels with proper wrapping and sizing
    leaves.each(function(d: any) {
      const group = d3.select(this);
      const width = (d.x1 || 0) - (d.x0 || 0);
      const height = (d.y1 || 0) - (d.y0 || 0);
      const centerX = ((d.x0 || 0) + (d.x1 || 0)) / 2;
      const centerY = ((d.y0 || 0) + (d.y1 || 0)) / 2;
      
      // Only show text if rectangle is large enough
      if (width > 40 && height > 20) {
        const name = d.data.name;
        const maxCharsPerLine = Math.floor(width / 6); // Estimate chars that fit
        const fontSize = Math.min(width / 12, height / 6, 9);
        
        if (fontSize >= 6) {
          // Split long names into multiple lines
          const words = name.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          for (const word of words) {
            if ((currentLine + word).length <= maxCharsPerLine) {
              currentLine += (currentLine ? ' ' : '') + word;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) lines.push(currentLine);
          
          // Limit to 2 lines max for small rectangles, 3 for larger ones
          const maxLines = height > 40 ? 3 : 2;
          const displayLines = lines.slice(0, maxLines);
          
          // Add text lines
          displayLines.forEach((line, i) => {
            const lineHeight = fontSize * 1.1;
            const totalHeight = displayLines.length * lineHeight;
            const startY = centerY - (totalHeight / 2) + (i * lineHeight) + (fontSize / 2);
            
            group.append('text')
              .attr('x', centerX)
              .attr('y', startY)
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .style('fill', '#ffffff')
              .style('font-size', fontSize + 'px')
              .style('font-weight', '500')
              .style('pointer-events', 'none')
              .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.5)')
              .text(line + (i === maxLines - 1 && lines.length > maxLines ? '...' : ''));
          });
        }
      }
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

  // Helper function to get role type (corrected logic)
  const getRoleType = (category: string) => {
    if (category === 'FinTech') return 'Data Recipient';
    if (category === 'Bank') return 'Data Provider';
    if (category === 'Invela') return 'Invela Platform';
    return 'Unknown';
  };

  // Helper function to format revenue value
  const formatRevenueValue = (value: any) => {
    if (!value || value === 0) return 'Not disclosed';
    // If it's already a formatted string from the database, return it directly
    if (typeof value === 'string' && value.includes('$')) return value;
    // Otherwise format as number
    if (typeof value === 'number') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    }
    return 'Not disclosed';
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
            
            {/* Key Details Grid - 6 specific fields in order */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Type</div>
                <div className="font-medium">{getRoleType(hoveredNode.category)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Size</div>
                <div className="font-medium">{hoveredNode.num_employees?.toLocaleString() || 'N/A'} employees</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Revenue Tier</div>
                <div className="font-medium text-green-400">{formatRevenueTier(hoveredNode.revenue_tier)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">ARR</div>
                <div className="font-medium text-blue-400">{formatRevenueValue(hoveredNode.revenue_value)}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Risk Score</div>
                <div className="font-medium">{hoveredNode.risk_score || 'N/A'}</div>
              </div>
              
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Accreditation</div>
                <div className="font-medium mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    hoveredNode.accreditation_status === 'APPROVED' 
                      ? 'bg-green-900 text-green-300' 
                      : hoveredNode.accreditation_status === 'PENDING'
                      ? 'bg-yellow-900 text-yellow-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {hoveredNode.accreditation_status || 'Not Started'}
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