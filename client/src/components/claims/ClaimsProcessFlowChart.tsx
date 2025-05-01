import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import * as d3 from 'd3';

// Define types for flow data
interface ProcessNode {
  id: string;
  name: string;
  type: 'start' | 'process' | 'decision' | 'end' | 'bank' | 'fintech' | 'breach';
  description?: string;
}

interface ProcessConnection {
  source: string;
  target: string;
  label?: string;
}

interface ProcessFlowData {
  nodes: ProcessNode[];
  connections: ProcessConnection[];
}

// Returns color based on node type
const getNodeColor = (type: ProcessNode['type']): { fill: string; stroke: string } => {
  switch (type) {
    case 'bank':
      return { fill: '#dbeafe', stroke: '#2563eb' }; // Blue
    case 'fintech':
      return { fill: '#f3e8ff', stroke: '#7c3aed' }; // Purple
    case 'decision':
      return { fill: '#fef9c3', stroke: '#eab308' }; // Yellow
    case 'process':
      return { fill: '#d1fae5', stroke: '#10b981' }; // Green
    case 'breach':
      return { fill: '#fee2e2', stroke: '#ef4444' }; // Red
    case 'start':
      return { fill: '#e0e7ff', stroke: '#4f46e5' }; // Indigo
    case 'end':
      return { fill: '#e2e8f0', stroke: '#64748b' }; // Slate
    default:
      return { fill: '#f9fafb', stroke: '#9ca3af' }; // Gray
  }
};

// Helper function to prepare claims process data
function prepareClaimsProcessData(): ProcessFlowData {
  // This would ideally come from an API
  const nodes: ProcessNode[] = [
    { id: 'breach', name: 'Data Breach', type: 'breach', description: 'Detection of PII data loss incident' },
    { id: 'bank_assessment', name: 'Bank Assessment', type: 'bank', description: 'Initial evaluation by the bank' },
    { id: 'fintech_notification', name: 'FinTech Notification', type: 'fintech', description: 'Notification sent to affected FinTech partners' },
    { id: 'dispute_assessment', name: 'Dispute?', type: 'decision', description: 'Is the claim disputed by any party?' },
    { id: 'process_claim', name: 'Process Claim', type: 'process', description: 'Standard claim processing procedure' },
    { id: 'documentation', name: 'Documentation Review', type: 'process', description: 'Review of all supporting documentation' },
    { id: 'valid_dispute', name: 'Valid Dispute?', type: 'decision', description: 'Is the dispute valid based on documentation?' },
    { id: 'fintech_resolution', name: 'FinTech Resolution', type: 'fintech', description: 'Resolution steps taken by FinTech' },
    { id: 'bank_review', name: 'Bank Final Review', type: 'bank', description: 'Final review by the bank' },
    { id: 'resolution', name: 'Claim Resolution', type: 'end', description: 'Final resolution of the claim' }
  ];
  
  const connections: ProcessConnection[] = [
    { source: 'breach', target: 'bank_assessment' },
    { source: 'breach', target: 'fintech_notification' },
    { source: 'bank_assessment', target: 'dispute_assessment' },
    { source: 'fintech_notification', target: 'dispute_assessment' },
    { source: 'dispute_assessment', target: 'process_claim', label: 'No' },
    { source: 'process_claim', target: 'resolution' },
    { source: 'dispute_assessment', target: 'documentation', label: 'Yes' },
    { source: 'documentation', target: 'valid_dispute' },
    { source: 'valid_dispute', target: 'fintech_resolution', label: 'Yes' },
    { source: 'fintech_resolution', target: 'bank_review' },
    { source: 'bank_review', target: 'resolution' },
    { source: 'valid_dispute', target: 'resolution', label: 'No' }
  ];
  
  return { nodes, connections };
}

interface ClaimsProcessFlowChartProps {
  className?: string;
}

export function ClaimsProcessFlowChart({ className }: ClaimsProcessFlowChartProps) {
  const [loading, setLoading] = useState(true);
  const [flowData, setFlowData] = useState<ProcessFlowData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Load the data
  useEffect(() => {
    const timer = setTimeout(() => {
      setFlowData(prepareClaimsProcessData());
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Define constants at component scope for access by nested functions
  const width = 1000;
  const height = 600;
  const nodeWidth = 140; // Slightly reduced width of rectangle nodes
  const nodeHeight = 60;
  const decisionNodeSize = 70; // for diamond shape (slightly reduced)

  // Create the visualization when data is available
  useEffect(() => {
    if (!flowData || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    // Clear any existing content
    svg.selectAll('*').remove();
    
    // Add a zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom as any);
    
    // Create a group for the entire diagram
    const g = svg.append('g')
      .attr('transform', 'translate(50, 50)');
    
    // Create a group for markers (arrowheads)
    const defs = svg.append('defs');
    
    // Define arrowhead markers
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#64748b');
      
    // Create a DAG layout
    const dagData = processFlowToDag(flowData);
    
    // Place nodes on a grid layout
    const nodesWithPositions = calculateNodePositions(dagData);
    
    // Draw connections first (so they're behind nodes)
    drawConnections(g, nodesWithPositions);
    
    // Draw nodes
    drawNodes(g, nodesWithPositions);
    
    // Calculate a more optimal initial view based on the actual nodes
    const nodePositionXExtent = d3.extent(nodesWithPositions, d => d.x);
    const nodePositionYExtent = d3.extent(nodesWithPositions, d => d.y);
    
    // Add some padding around the nodes
    const xPadding = 100;
    const yPadding = 60;
    
    // Center and scale to fit
    const xRange = (nodePositionXExtent[1] || 0) - (nodePositionXExtent[0] || 0) + nodeWidth + xPadding*2;
    const yRange = (nodePositionYExtent[1] || 0) - (nodePositionYExtent[0] || 0) + nodeHeight + yPadding*2;
    
    const scale = Math.min(width / xRange, height / yRange, 0.8);
    
    const translateX = (width - xRange * scale) / 2 - (nodePositionXExtent[0] || 0) * scale + xPadding * scale;
    const translateY = (height - yRange * scale) / 2 - (nodePositionYExtent[0] || 0) * scale + yPadding * scale;
    
    const initialTransform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);
    
    svg.call(zoom.transform as any, initialTransform);
    
  }, [flowData]);
  
  // Helper: Convert flow data to DAG format with levels
  function processFlowToDag(data: ProcessFlowData) {
    const nodes = [...data.nodes];
    const connections = [...data.connections];
    
    // Identify start nodes (nodes that are only sources, never targets)
    const targetNodeIds = new Set(connections.map(c => c.target));
    const startNodeIds = nodes
      .filter(node => !targetNodeIds.has(node.id))
      .map(node => node.id);
    
    // Assign levels to nodes using breadth-first traversal
    const nodeLevels: Record<string, number> = {};
    const processed = new Set<string>();
    
    // Initialize start nodes to level 0
    let currentLevel = 0;
    let currentNodes = startNodeIds;
    
    while (currentNodes.length > 0) {
      const nextNodes: string[] = [];
      
      // Process current level
      currentNodes.forEach(nodeId => {
        if (!processed.has(nodeId)) {
          nodeLevels[nodeId] = currentLevel;
          processed.add(nodeId);
          
          // Find outgoing connections from this node
          connections
            .filter(conn => conn.source === nodeId)
            .forEach(conn => {
              if (!processed.has(conn.target)) {
                nextNodes.push(conn.target);
              }
            });
        }
      });
      
      // Move to next level
      currentNodes = nextNodes;
      currentLevel++;
    }
    
    // If there are unprocessed nodes (due to cycles), handle them
    const unprocessedNodes = nodes.filter(node => !processed.has(node.id));
    if (unprocessedNodes.length > 0) {
      // Simple approach: just assign these nodes to level 0
      unprocessedNodes.forEach(node => {
        nodeLevels[node.id] = 0;
      });
    }
    
    return {
      nodes,
      connections,
      levels: nodeLevels
    };
  }
  
  // Helper: Calculate positions for each node based on levels
  function calculateNodePositions(dagData: ReturnType<typeof processFlowToDag>) {
    const { nodes, levels } = dagData;
    
    // Group nodes by their level
    const nodesByLevel: Record<number, ProcessNode[]> = {};
    nodes.forEach(node => {
      const level = levels[node.id] || 0;
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(node);
    });
    
    // Determine the maximum number of nodes at any level
    const maxNodesPerLevel = Math.max(...Object.values(nodesByLevel).map(nodes => nodes.length));
    
    // Calculate horizontal and vertical spacing
    const levelWidth = 200; // Space between levels (reduced from 220)
    const nodeHeight = 60; // Height of a node (same as in the main function)
    const nodeSpacing = 80;  // Minimum space between nodes at the same level (reduced from 100)
    
    // Calculate total height needed for the diagram
    const totalHeight = maxNodesPerLevel * (nodeHeight + nodeSpacing);
    
    // Position nodes
    const nodesWithPositions: (ProcessNode & { x: number; y: number })[] = [];
    
    Object.entries(nodesByLevel).forEach(([levelStr, levelNodes]) => {
      const level = parseInt(levelStr);
      const levelNodeCount = levelNodes.length;
      
      // Distribute nodes evenly within their level
      levelNodes.forEach((node, i) => {
        const x = level * levelWidth;
        let y = 0;
        
        if (levelNodeCount === 1) {
          // If there's only one node at this level, center it
          y = totalHeight / 2;
        } else {
          // Otherwise, distribute nodes evenly
          const levelHeight = (levelNodeCount - 1) * (nodeHeight + nodeSpacing);
          const startY = (totalHeight - levelHeight) / 2;
          y = startY + i * (nodeHeight + nodeSpacing);
        }
        
        nodesWithPositions.push({
          ...node,
          x,
          y
        });
      });
    });
    
    return nodesWithPositions;
  }
  
  // Helper: Draw connections between nodes
  function drawConnections(g: d3.Selection<SVGGElement, unknown, null, undefined>, 
                          nodesWithPositions: (ProcessNode & { x: number; y: number })[]) {
    const { connections } = flowData!;
    
    // Create a map of nodes by id for easy lookup
    const nodesById = new Map(nodesWithPositions.map(node => [node.id, node]));
    
    // Draw each connection
    connections.forEach(connection => {
      const sourceNode = nodesById.get(connection.source);
      const targetNode = nodesById.get(connection.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Calculate connection points based on node types
      let sourceX, sourceY, targetX, targetY;
      
      // For source node
      if (sourceNode.type === 'decision') {
        // For decision node (diamond), connect from right point
        sourceX = sourceNode.x + decisionNodeSize / 2;
        sourceY = sourceNode.y;
      } else {
        // For rectangular nodes, connect from right edge
        sourceX = sourceNode.x + nodeWidth;
        sourceY = sourceNode.y + nodeHeight / 2;
      }
      
      // For target node
      if (targetNode.type === 'decision') {
        // For decision node (diamond), connect to left point
        targetX = targetNode.x - decisionNodeSize / 2;
        targetY = targetNode.y;
      } else {
        // For rectangular nodes, connect to left edge
        targetX = targetNode.x;
        targetY = targetNode.y + nodeHeight / 2;
      }
      
      // Create path with curve
      const path = g.append('path')
        .attr('d', () => {
          // Simple curve using bezier
          const midX = (sourceX + targetX) / 2;
          return `M${sourceX},${sourceY} 
                 C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
        })
        .attr('fill', 'none')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrowhead)');
      
      // Add connection label if present
      if (connection.label) {
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        
        g.append('rect')
          .attr('x', midX - 15)
          .attr('y', midY - 10)
          .attr('width', 30)
          .attr('height', 20)
          .attr('fill', 'white')
          .attr('stroke', '#e2e8f0')
          .attr('rx', 4);
          
        g.append('text')
          .attr('x', midX)
          .attr('y', midY + 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('fill', '#64748b')
          .text(connection.label);
      }
    });
  }
  
  // Helper: Draw all nodes
  function drawNodes(g: d3.Selection<SVGGElement, unknown, null, undefined>, 
                    nodesWithPositions: (ProcessNode & { x: number; y: number })[]) {
    
    nodesWithPositions.forEach(node => {
      const { x, y, type, name, description } = node;
      const colors = getNodeColor(type);
      
      // Create a group for the node
      const nodeGroup = g.append('g')
        .attr('class', 'node')
        .attr('data-id', node.id);
        
      // Draw appropriate shape based on node type
      if (type === 'decision') {
        // Diamond shape for decision nodes
        const diamondSize = decisionNodeSize;
        
        nodeGroup.append('polygon')
          .attr('points', [
            [x, y - diamondSize/2].join(','),  // top
            [x + diamondSize/2, y].join(','),  // right
            [x, y + diamondSize/2].join(','),  // bottom
            [x - diamondSize/2, y].join(',')   // left
          ].join(' '))
          .attr('fill', colors.fill)
          .attr('stroke', colors.stroke)
          .attr('stroke-width', 2);
          
        // Add text to the decision node
        nodeGroup.append('text')
          .attr('x', x)
          .attr('y', y)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#334155')
          .text(name);
      } else {
        // Rectangular shape for all other nodes
        nodeGroup.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', nodeWidth)
          .attr('height', nodeHeight)
          .attr('rx', 6)
          .attr('ry', 6)
          .attr('fill', colors.fill)
          .attr('stroke', colors.stroke)
          .attr('stroke-width', 2);
          
        // Add title text
        nodeGroup.append('text')
          .attr('x', x + nodeWidth / 2)
          .attr('y', y + 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('fill', '#334155')
          .text(name);
          
        // Add description text if available
        if (description && description.length > 0) {
          nodeGroup.append('text')
            .attr('x', x + nodeWidth / 2)
            .attr('y', y + 45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#64748b')
            .text(description.length > 25 ? description.substring(0, 22) + '...' : description);
        }
      }
      
      // Add interaction for tooltips (could be expanded)
      nodeGroup
        .style('cursor', 'pointer')
        .on('mouseover', function() {
          d3.select(this).select('rect, polygon')
            .transition()
            .duration(200)
            .attr('stroke-width', 3);
        })
        .on('mouseout', function() {
          d3.select(this).select('rect, polygon')
            .transition()
            .duration(200)
            .attr('stroke-width', 2);
        });
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <Skeleton className="h-[400px] w-full" />
        <div className="text-center mt-4">
          <p className="text-muted-foreground">Loading process flow chart...</p>
        </div>
      </div>
    );
  }
  
  if (!flowData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-500">Error loading process flow data</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`w-full h-full p-2 ${className || ''}`}>
      <div className="relative h-[600px] w-full overflow-hidden border rounded-md">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="bg-white"
        />
        <div className="absolute top-2 right-2 text-xs text-gray-500">
          <p>Scroll to zoom, drag to pan</p>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="text-sm font-semibold mb-2">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
            <span className="text-xs">Data Breach</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
            <span className="text-xs">Bank Actions</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
            <span className="text-xs">FinTech Actions</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
            <span className="text-xs">Decision Points</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
            <span className="text-xs">Processes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
