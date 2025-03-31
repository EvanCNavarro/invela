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
  riskBucketColors 
} from './types';
import { Loader2 } from 'lucide-react';

interface NetworkVisualizationProps {
  className?: string;
}

export function NetworkVisualization({ className }: NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
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
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);
    });

    // Draw center node
    g.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 25)
      .attr('fill', centerNodeColor)
      .attr('stroke', '#000')
      .attr('stroke-width', 2)
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
      // Use a darker border for better contrast, especially for high vs critical nodes
      const borderColor = node.accreditationStatus === 'APPROVED' ? '#22c55e' : '#000000';

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
          d3.select(this).attr('stroke-width', 3.5);
        })
        .on('mouseout', function() {
          const isSelected = selectedNode && selectedNode.id === node.id;
          d3.select(this).attr('stroke-width', isSelected ? 3.5 : 2.5);
        })
        .on('click', (event) => {
          // Highlight the connection
          g.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-width', 1);
          g.selectAll('circle').attr('stroke-width', 2.5);
          
          d3.select(event.currentTarget)
            .attr('stroke-width', 3.5);
          
          // Highlight the line connecting to this node
          g.selectAll('line')
            .filter((_, i) => i === index)
            .attr('stroke', '#000')
            .attr('stroke-width', 2);
          
          setSelectedNode(node);
          event.stopPropagation();
        });

      nodeElement.append('title')
        .text(node.name);
    });

    // Clear selection when clicking on background
    svg.on('click', () => {
      // Reset all lines and nodes
      g.selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-width', 1);
      g.selectAll('circle').attr('stroke-width', 2.5);
      setSelectedNode(null);
    });

  }, [data, filteredNodes, selectedNode]);

  // Handle window clicks to close details
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) {
        setSelectedNode(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between pb-2 space-y-0 border-b">
        <div></div>
        <NetworkFiltersComponent 
          filters={filters} 
          onFiltersChange={setFilters} 
        />
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
                  onClose={() => setSelectedNode(null)} 
                />
              )}
            </div>
            <div className="flex justify-center items-center p-2 border-t">
              <div className="flex items-center space-x-8">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}