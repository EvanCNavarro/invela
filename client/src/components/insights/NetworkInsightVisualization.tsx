import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { ConnectionDetails } from '@/components/network/ConnectionDetails';
import { 
  NetworkNode, 
  NetworkVisualizationData, 
  centerNodeColor, 
  riskBucketColors 
} from '@/components/network/types';
import { Loader2, CheckCircle } from 'lucide-react';
import { ContainerAwareChartWrapper } from '@/components/ui/container-aware-chart-wrapper';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';

interface NetworkInsightVisualizationProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Internal component that renders the network visualization with responsive dimensions
 */
function NetworkInsightVisualizationInternal({ 
  className, 
  width = 800, 
  height = 500 
}: NetworkInsightVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedNodePosition, setSelectedNodePosition] = useState<{x: number, y: number} | null>(null);
  
  // For accreditation stats
  const [accreditationStats, setAccreditationStats] = useState<{
    approved: number;
    total: number;
  }>({ approved: 0, total: 0 });

  // Fetch network data
  const { data, isLoading, error } = useQuery<NetworkVisualizationData>({
    queryKey: ['/api/network/visualization'],
    enabled: true
  });

  // Calculate accreditation stats whenever data changes
  useEffect(() => {
    if (data && data.nodes) {
      const approvedCount = data.nodes.filter(node => node.accreditationStatus === 'APPROVED').length;
      setAccreditationStats({
        approved: approvedCount,
        total: data.nodes.length
      });
    }
  }, [data]);
  
  // D3 visualization - responsive version using provided dimensions
  useEffect(() => {
    if (!svgRef.current || !data || !width || !height) return;

    console.debug('[NetworkInsightVisualization] Rendering with dimensions:', { width, height });

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const centerX = width / 2;
    const centerY = height / 2;

    // Create a group element for the visualization
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Create radial layout
    const radius = Math.min(width, height) * 0.4;
    const filteredNodes = data.nodes; // No filters in this version
    const numberOfNodes = filteredNodes.length;
    const angleStep = (2 * Math.PI) / numberOfNodes;

    // Draw lines from center to each node
    filteredNodes.forEach((_, index) => {
      const angle = index * angleStep;
      const x2 = radius * Math.cos(angle);
      const y2 = radius * Math.sin(angle);

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1.5);
    });

    // Draw center node
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 25)
      .attr('fill', centerNodeColor)
      .attr('stroke', '#000')
      .attr('stroke-width', 2)
      .attr('class', 'center-node')
      .attr('data-node-id', data.center.id)
      .append('title')
      .text(data.center.name);

    // Add center node label
    g.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .style('font-size', '10px')
      .text(data.center.name.substring(0, 6));

    // Draw outer nodes
    filteredNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const nodeColor = riskBucketColors[node.riskBucket];
      // Add border only for accredited companies
      const borderColor = node.accreditationStatus === 'APPROVED' ? '#22c55e' : 'transparent';

      // Capture the node element for click handling
      g.append('circle')
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
            
          // Enhanced tooltip
          const tooltip = g.append('g')
            .attr('class', 'node-tooltip')
            .attr('transform', `translate(${x}, ${y - 30})`);
          
          tooltip.append('rect')
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('x', -node.name.length * 3 - 8)
            .attr('y', -20)
            .attr('width', node.name.length * 6 + 16)
            .attr('height', 26)
            .attr('fill', 'white')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-width', 1);
            
          tooltip.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', -4)
            .attr('fill', '#1e293b')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text(node.name);
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
          const nodeX = centerX + x;
          
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

  }, [data, selectedNode, width, height]);

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
    <div className={`relative ${className}`}>
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center space-y-2" style={{ height }}>
          <div className="text-destructive font-medium">Failed to load network data</div>
          <div className="text-xs text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : 'Check console for details'}
          </div>
        </div>
      ) : (
        <>
          {/* Network visualization with responsive dimensions */}
          <div className="relative">
            <svg 
              ref={svgRef} 
              width={width} 
              height={height} 
              className="bg-muted/20 rounded-lg"
            ></svg>
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
          
          {/* Risk level legend at the bottom */}
          <div className="border-t mt-3">
            {/* Risk level indicators */}
            <div className="flex justify-center items-center pt-2 pb-1">
              <div className="flex items-center gap-x-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#FFFFFF] border border-black"></span>
                  <span className="text-xs">None (0)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#DFE3EA] border border-black"></span>
                  <span className="text-xs">Low (1-33)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#B3B8C6] border border-black"></span>
                  <span className="text-xs">Medium (34-66)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#7B74A8] border border-black"></span>
                  <span className="text-xs">High (67-99)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#4C2F54] border border-black"></span>
                  <span className="text-xs">Critical (100)</span>
                </div>
                <div className="flex items-center pl-4 border-l border-gray-200">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-muted border-2 border-[#22c55e]"></span>
                    <span className="text-xs">Accredited</span>
                  </span>
                </div>
              </div>
            </div>
            
            {/* Accreditation stats below the legend */}
            <div className="flex justify-center items-center pb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  {accreditationStats.approved} of {accreditationStats.total} companies accredited ({Math.round((accreditationStats.approved / accreditationStats.total) * 100) || 0}%)
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Responsive NetworkInsightVisualization component with error boundary
 * Automatically adapts to container dimensions and provides graceful error handling
 */
export function NetworkInsightVisualization({ className }: { className?: string }) {
  return (
    <ChartErrorBoundary chartName="NetworkInsightVisualization">
      <ContainerAwareChartWrapper
        className={className}
        minWidth={400}
        minHeight={350}
        aspectRatio={16/10}
        fallbackHeight={500}
      >
        {({ width, height }: { width: number; height: number }) => (
          <NetworkInsightVisualizationInternal 
            className={className}
            width={width}
            height={height}
          />
        )}
      </ContainerAwareChartWrapper>
    </ChartErrorBoundary>
  );
}