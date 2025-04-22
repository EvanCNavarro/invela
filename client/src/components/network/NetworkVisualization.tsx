import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworkFiltersComponent } from './NetworkFilters';
import { ConnectionDetails } from './ConnectionDetails';
import { 
  NetworkFilters, 
  NetworkNode, 
  NetworkVisualizationData, 
  RiskBucket, 
  centerNodeColor, 
  centerUserPurple,
  riskBucketColors,
  companyTypeColors
} from './types';
import { Loader2 } from 'lucide-react';

interface NetworkVisualizationProps {
  className?: string;
}

export function NetworkVisualization({ className }: NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedNodePosition, setSelectedNodePosition] = useState<{x: number, y: number} | null>(null);
  const [filters, setFilters] = useState<NetworkFilters>({
    riskBuckets: [],
    accreditationStatus: []
  });

  // Fetch network data
  const { data, isLoading, error } = useQuery<NetworkVisualizationData>({
    queryKey: ['/api/network/visualization'],
    enabled: true
  });

  // Filter nodes based on selected filters
  const filteredNodes = React.useMemo(() => {
    if (!data) return [];

    return data.nodes.filter(node => {
      // If no risk bucket filters, show all risk levels
      const matchesRiskBucket = filters.riskBuckets.length === 0 || 
        filters.riskBuckets.includes(node.riskBucket);
      
      // If no accreditation status filters, show all statuses
      const matchesAccreditationStatus = filters.accreditationStatus.length === 0 || 
        filters.accreditationStatus.includes(node.accreditationStatus);
      
      return matchesRiskBucket && matchesAccreditationStatus;
    });
  }, [data, filters]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !data || filteredNodes.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    // Set up the visualization container
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Create radial lines
    const numberOfNodes = filteredNodes.length;
    const angleStep = (2 * Math.PI) / numberOfNodes;

    // Draw center node with color based on company type
    // Use companyTypeColors for the center node (Bank=purple, Invela=blue, FinTech=green)
    const centerCompanyColor = companyTypeColors[data.center.category] || companyTypeColors['Default'];
    
    // Add defs for gradients
    const defs = svg.append('defs');
    
    // Draw lines from center to each node with subtle gradient
    filteredNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x2 = radius * Math.cos(angle);
      const y2 = radius * Math.sin(angle);
      
      // Create subtle gradient effect for each line
      const lineGradientId = `line-gradient-${index}`;
      
      const gradient = defs.append('linearGradient')
        .attr('id', lineGradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2);
        
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', centerCompanyColor)
        .attr('stop-opacity', 0.3);
        
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', riskBucketColors[node.riskBucket])
        .attr('stop-opacity', 0.5);
      
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', `url(#${lineGradientId})`)
        .attr('stroke-width', 1.5);
    });
    // Add a white background circle for better visibility
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 30)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1.5);
    
    // Main center node with company type color
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 28)
      .attr('fill', centerCompanyColor)
      .attr('stroke', '#000')
      .attr('stroke-width', 2)
      .attr('class', 'center-node')
      .attr('data-node-id', data.center.id)
      .append('title')
      .text(data.center.name);

    // Add center node label with improved styling
    g.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .text(data.center.name.substring(0, 6));

    // Draw outer nodes
    filteredNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      // Use risk bucket color for all nodes for consistent risk-based coloring
      const nodeColor = riskBucketColors[node.riskBucket];
      // Add border only for accredited companies
      const borderColor = node.accreditationStatus === 'APPROVED' ? '#22c55e' : 'transparent';

      // Draw white background circle for outer nodes
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 17)
        .attr('fill', 'white')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);
      
      // Capture the node element for click handling
      const nodeElement = g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 15)
        .attr('fill', nodeColor)
        .attr('stroke', borderColor)
        .attr('stroke-width', 2.5)
        .attr('cursor', 'pointer')
        .attr('data-node-id', node.id)
        .on('mouseover', function() {
          // Create a more visible tooltip
          d3.select(this).attr('stroke-width', 3.5);
          
          // Highlight the connection on hover
          g.selectAll('line')
            .filter((_, i) => i === index)
            .attr('stroke', '#4b5563')
            .attr('stroke-width', 1.8);
            
          // Enhanced tooltip with improved styling
          const tooltip = g.append('g')
            .attr('class', 'node-tooltip')
            .attr('transform', `translate(${x}, ${y - 40})`);
          
          // Calculate tooltip width based on text length
          const tooltipWidth = Math.max(node.name.length * 7, 100);
          
          // Add drop shadow for the tooltip
          const dropShadow = defs.append('filter')
            .attr('id', `drop-shadow-${index}`)
            .attr('height', '130%');
            
          dropShadow.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 2)
            .attr('result', 'blur');
            
          dropShadow.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 0)
            .attr('dy', 1)
            .attr('result', 'offsetBlur');
            
          const feMerge = dropShadow.append('feMerge');
          feMerge.append('feMergeNode')
            .attr('in', 'offsetBlur');
          feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');
          
          // Draw tooltip background with shadow
          tooltip.append('rect')
            .attr('rx', 6)
            .attr('ry', 6)
            .attr('x', -tooltipWidth/2)
            .attr('y', -30)
            .attr('width', tooltipWidth)
            .attr('height', 36)
            .attr('fill', 'white')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1)
            .attr('filter', `url(#drop-shadow-${index})`);
          
          // Triangle pointer at the bottom
          tooltip.append('path')
            .attr('d', 'M-8,6 L0,14 L8,6')
            .attr('fill', 'white')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1);
            
          // Company name text
          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', -10)
            .attr('fill', '#1e293b')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .text(node.name);
          
          // Risk level text
          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', 8)
            .attr('fill', '#64748b')
            .style('font-size', '11px')
            .style('font-weight', '400')
            .text(`Risk: ${node.riskBucket.charAt(0).toUpperCase() + node.riskBucket.slice(1)}`);
        })
        .on('mouseout', function() {
          const isSelected = selectedNode && selectedNode.id === node.id;
          d3.select(this).attr('stroke-width', isSelected ? 3.5 : 2.5);
          
          // Only reset the line if not selected
          if (!isSelected) {
            g.selectAll('line')
              .filter((_, i) => i === index)
              .attr('stroke', '#94a3b8')
              .attr('stroke-width', 1.5);
          }
          
          // Remove tooltip
          g.selectAll('.node-tooltip').remove();
        })
        .on('click', function(event) {
          // Reset all connections to default
          g.selectAll('line').attr('stroke', '#94a3b8').attr('stroke-width', 1.5);
          
          // Reset all node borders to their original state
          g.selectAll('circle:not(.center-node)').each(function() {
            const circle = d3.select(this);
            const nodeId = circle.attr('data-node-id');
            const nodeData = data?.nodes.find(n => n.id.toString() === nodeId);
            
            // Set back to original border (accreditation status)
            circle.attr('stroke', nodeData?.accreditationStatus === 'APPROVED' ? '#22c55e' : 'transparent')
              .attr('stroke-width', 2.5);
          });
          
          // Set black border on the selected node immediately using direct DOM reference
          const selectedNode = d3.select(this);
          selectedNode.attr('stroke', '#000')
                     .attr('stroke-width', 3.5);
          
          // Highlight the line connecting to this node with black
          g.selectAll('line')
            .filter((_, i) => i === index)
            .attr('stroke', '#000')
            .attr('stroke-width', 2);
          
          // Store the node's position for connection details panel positioning
          const rect = svgRef.current?.getBoundingClientRect();
          const nodeX = rect ? centerX + x : 0;
          
          // Update state after visual changes to ensure UI is consistent
          setSelectedNodePosition({ x: nodeX, y: 0 });
          setSelectedNode(node);
          
          // Stop propagation to prevent background click
          event.stopPropagation();
        });
    });

    // Clear selection when clicking on background
    svg.on('click', () => {
      // Reset all lines to default
      g.selectAll('line').attr('stroke', '#94a3b8').attr('stroke-width', 1.5);
      
      // Reset center node to default style
      g.select('.center-node')
        .attr('stroke', '#000')
        .attr('stroke-width', 2);
      
      // Reset all other nodes to their original accreditation borders
      g.selectAll('circle:not(.center-node)').each(function() {
        const circle = d3.select(this);
        const nodeId = circle.attr('data-node-id');
        const nodeData = data?.nodes.find(n => n.id.toString() === nodeId);
        
        circle
          .attr('stroke', nodeData?.accreditationStatus === 'APPROVED' ? '#22c55e' : 'transparent')
          .attr('stroke-width', 2.5);
      });
      
      setSelectedNode(null);
      setSelectedNodePosition(null);
    });

  }, [data, filteredNodes, selectedNode]);

  // Handle window clicks to close details
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) {
        // Reset the visualization when clicking outside
        if (svgRef.current) {
          const svg = d3.select(svgRef.current);
          const g = svg.select('g');
          
          if (g.node()) {
            // Reset connection lines
            g.selectAll('line').attr('stroke', '#94a3b8').attr('stroke-width', 1.5);
            
            // Reset center node to default style
            g.select('.center-node')
              .attr('stroke', '#000')
              .attr('stroke-width', 2);
            
            // Reset all other nodes to their original accreditation borders
            g.selectAll('circle:not(.center-node)').each(function() {
              const circle = d3.select(this);
              const nodeId = circle.attr('data-node-id');
              const nodeData = data?.nodes.find(n => n.id.toString() === nodeId);
              
              circle
                .attr('stroke', nodeData?.accreditationStatus === 'APPROVED' ? '#22c55e' : 'transparent')
                .attr('stroke-width', 2.5);
            });
          }
        }
        
        setSelectedNode(null);
        setSelectedNodePosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2 space-y-2 border-b">
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-4">
          <NetworkFiltersComponent 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
          
          <div className="flex items-center self-start space-x-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#DFE3EA] border border-black"></span>
              <span className="text-xs">Low</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#B3B8C6] border border-black"></span>
              <span className="text-xs">Medium</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#7B74A8] border border-black"></span>
              <span className="text-xs">High</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#4C2F54] border border-black"></span>
              <span className="text-xs">Critical</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] space-y-2">
            <div className="text-destructive font-medium">Failed to load network data</div>
            <div className="text-xs text-muted-foreground max-w-md">
              {error instanceof Error ? error.message : 'Check console for details'}
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <svg ref={svgRef} width="100%" height="400" className="bg-muted/20 rounded-b-lg"></svg>
              {selectedNode && data && (
                <ConnectionDetails 
                  node={selectedNode} 
                  centerNode={data.center} 
                  position={selectedNodePosition}
                  onClose={() => {
                    setSelectedNode(null);
                    setSelectedNodePosition(null);
                    // Reset all lines and nodes when closing details
                    if (svgRef.current) {
                      const svg = d3.select(svgRef.current);
                      const g = svg.select('g');
                      // Reset connection lines
                      g.selectAll('line').attr('stroke', '#94a3b8').attr('stroke-width', 1.5);
                      
                      // Reset node styles safely
                      // Center node gets its standard style
                      g.select('.center-node')
                        .attr('stroke', '#000')
                        .attr('stroke-width', 2);
                      
                      // Company nodes get their accreditation styles from their current stored styles
                      // This is safer than trying to access datum() which might be null
                      g.selectAll('circle:not(.center-node)').each(function() {
                        const circle = d3.select(this);
                        const currentStroke = circle.attr('stroke');
                        // If it was explicitly set to black (selected), reset it to original color
                        if (currentStroke === '#000') {
                          // Check for the original data-node-id attribute we added
                          const nodeId = circle.attr('data-node-id');
                          // Find the node data
                          const nodeData = data?.nodes.find(n => n.id.toString() === nodeId);
                          // Set the correct border based on accreditation
                          circle.attr('stroke', nodeData?.accreditationStatus === 'APPROVED' ? '#22c55e' : 'transparent');
                        }
                        // Reset stroke width for all nodes
                        circle.attr('stroke-width', 2.5);
                      });
                    }
                  }} 
                />
              )}
            </div>

          </>
        )}
      </CardContent>
    </Card>
  );
}