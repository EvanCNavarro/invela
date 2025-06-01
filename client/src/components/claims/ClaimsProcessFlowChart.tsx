import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ResponsiveChartWrapper, getResponsiveChartConfig } from '@/components/ui/responsive-chart-wrapper';
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
  width?: number;
  height?: number;
}

// Internal component that handles the actual D3 rendering
function ClaimsProcessFlowChartInternal({ 
  className, 
  width = 800, 
  height = 500 
}: ClaimsProcessFlowChartProps) {
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

  // Calculate responsive node sizes based on available space
  const config = getResponsiveChartConfig(width);
  const nodeWidth = Math.max(120, width * 0.14); // 14% of container width, min 120px
  const nodeHeight = Math.max(50, height * 0.08); // 8% of container height, min 50px
  const decisionNodeSize = Math.max(60, Math.min(nodeWidth, nodeHeight) * 0.85);

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
    const g = svg.append('g');
    
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
  
  // Helper: Calculate positions for each node in a more linear flow
  function calculateNodePositions(dagData: ReturnType<typeof processFlowToDag>) {
    const { nodes, levels } = dagData;
    const { connections } = flowData!;
    
    // Create a map for quick node lookup
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    // Group nodes by their level
    const nodesByLevel: Record<number, ProcessNode[]> = {};
    nodes.forEach(node => {
      const level = levels[node.id] || 0;
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(node);
    });
    
    // Sort levels for linear layout
    const sortedLevels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);
    
    // Determine key nodes for better positioning
    const nodeTypes = {
      breach: nodes.find(node => node.type === 'breach' || (node.name && node.name.toLowerCase().includes('breach'))),
      bank: nodes.find(node => node.type === 'bank' || (node.name && node.name.toLowerCase().includes('bank'))),
      fintech: nodes.find(node => node.type === 'fintech' || (node.name && node.name.toLowerCase().includes('fintech'))),
      decision: nodes.find(node => node.type === 'decision')
    };
    
    // Define spacing parameters for the linear layout
    const spacing = {
      horizontal: 250,  // Space between levels
      vertical: 120,    // Space between nodes within a level
      startX: 100,      // Starting X position
      startY: 100,      // Starting Y position
      middleOffset: 180 // Vertical offset to place nodes between two others
    };
    
    // Special case: if there's a decision node, position it in the middle of the flow
    let decisionNodeLevel: number | null = null;
    if (nodeTypes.decision) {
      decisionNodeLevel = levels[nodeTypes.decision.id];
    }
    
    // Track positions to place nodes in a more linear fashion
    const nodesWithPositions: (ProcessNode & { x: number; y: number })[] = [];

    // Place nodes level by level in a more linear flow
    sortedLevels.forEach((level, levelIndex) => {
      const nodesInLevel = nodesByLevel[level];
      
      // Special handling for levels with decision nodes
      if (level === decisionNodeLevel && nodeTypes.decision) {
        // Place decision node in the middle
        const x = spacing.startX + level * spacing.horizontal;
        const y = spacing.startY + spacing.vertical;
        
        // Add decision node to positions
        nodesWithPositions.push({
          ...nodeTypes.decision,
          x,
          y
        });
        
        // Handle other nodes in this level (if any)
        nodesInLevel
          .filter(node => node.id !== nodeTypes.decision!.id)
          .forEach((node, nodeIndex) => {
            // Place other nodes at this level above or below the decision node
            // with proper spacing
            const yOffset = nodeIndex % 2 === 0 ? -spacing.vertical : spacing.vertical * 2;
            
            nodesWithPositions.push({
              ...node,
              x,
              y: y + yOffset
            });
          });
      } else {
        // Normal level - arrange nodes vertically
        const x = spacing.startX + level * spacing.horizontal;
        
        // Sort nodes by type to prioritize key nodes
        const sortedNodes = [...nodesInLevel].sort((a, b) => {
          // Prioritize key node types for better positioning
          if (a.id === (nodeTypes.breach?.id ?? '')) return -1;
          if (b.id === (nodeTypes.breach?.id ?? '')) return 1;
          if (a.id === (nodeTypes.bank?.id ?? '')) return -1;
          if (b.id === (nodeTypes.bank?.id ?? '')) return 1;
          if (a.id === (nodeTypes.fintech?.id ?? '')) return -1;
          if (b.id === (nodeTypes.fintech?.id ?? '')) return 1;
          return 0;
        });
        
        // If there's a decision node in the next level, create a fork-like layout
        const nextLevel = sortedLevels[levelIndex + 1];
        const hasDecisionNodeNextLevel = decisionNodeLevel !== null && nextLevel === decisionNodeLevel;
        
        if (hasDecisionNodeNextLevel) {
          // Position nodes in a way that flows into the decision node
          sortedNodes.forEach((node, nodeIndex) => {
            let y;
            
            // Create a fork pattern feeding into the decision node
            if (nodeIndex === 0) {
              // First node at typical middle position (feeds into decision)
              y = spacing.startY + spacing.vertical;
            } else if (nodeTypes.bank && node.id === nodeTypes.bank.id) {
              // Bank node above
              y = spacing.startY;
            } else if (nodeTypes.fintech && node.id === nodeTypes.fintech.id) {
              // FinTech node below
              y = spacing.startY + spacing.vertical * 2;
            } else {
              // Fallback positioning
              y = spacing.startY + (nodeIndex * spacing.vertical);
            }
            
            nodesWithPositions.push({ ...node, x, y });
          });
        } else if (decisionNodeLevel !== null && level > decisionNodeLevel) {
          // Fork pattern coming from decision node
          // Find nodes connected from decision node
          const yesNodes = connections
            .filter(conn => 
              conn.source === nodeTypes.decision!.id && 
              conn.label && 
              (conn.label.toLowerCase().includes('yes') || conn.label.toLowerCase().includes('true'))
            )
            .map(conn => nodeMap.get(conn.target))
            .filter(node => node) as ProcessNode[];
          
          const noNodes = connections
            .filter(conn => 
              conn.source === nodeTypes.decision!.id && 
              conn.label && 
              (conn.label.toLowerCase().includes('no') || conn.label.toLowerCase().includes('false'))
            )
            .map(conn => nodeMap.get(conn.target))
            .filter(node => node) as ProcessNode[];
          
          // Position yes path above, no path below
          sortedNodes.forEach((node, nodeIndex) => {
            let y;
            
            if (yesNodes.some(n => n.id === node.id)) {
              // Yes branch nodes go above
              y = spacing.startY;
            } else if (noNodes.some(n => n.id === node.id)) {
              // No branch nodes go below
              y = spacing.startY + spacing.vertical * 2;
            } else {
              // Other nodes are distributed evenly
              y = spacing.startY + (nodeIndex * spacing.vertical);
            }
            
            nodesWithPositions.push({ ...node, x, y });
          });
        } else {
          // Standard linear layout
          sortedNodes.forEach((node, nodeIndex) => {
            const y = spacing.startY + (nodeIndex * spacing.vertical);
            nodesWithPositions.push({ ...node, x, y });
          });
        }
      }
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
      
      // Calculate connection points based on node types and positions
      let sourceX, sourceY, targetX, targetY;
      let sourceEdge: 'right' | 'left' | 'top' | 'bottom' = 'right';
      let targetEdge: 'right' | 'left' | 'top' | 'bottom' = 'left';
      
      // Determine best connection edges based on relative positions
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const sourceCenterX = sourceNode.x + (sourceNode.type === 'decision' ? 0 : nodeWidth / 2);
      const sourceCenterY = sourceNode.y + (sourceNode.type === 'decision' ? 0 : nodeHeight / 2);
      const targetCenterX = targetNode.x + (targetNode.type === 'decision' ? 0 : nodeWidth / 2);
      const targetCenterY = targetNode.y + (targetNode.type === 'decision' ? 0 : nodeHeight / 2);
      
      // Special handling for decision nodes - they have specific connection points
      if (sourceNode.type === 'decision') {
        // Choose the appropriate edge based on target position relative to decision node
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal connection is dominant
          sourceEdge = dx > 0 ? 'right' : 'left';
        } else {
          // Vertical connection is dominant
          sourceEdge = dy > 0 ? 'bottom' : 'top';
        }
      } else {
        // For rectangular nodes, choose based on relative position for cleaner layout
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          // Horizontal connection is much more dominant
          sourceEdge = dx > 0 ? 'right' : 'left';
        } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
          // Vertical connection is much more dominant
          sourceEdge = dy > 0 ? 'bottom' : 'top';
        } else {
          // Default to right edge connection for rectangle nodes if not clearly vertical/horizontal
          sourceEdge = 'right';
        }
      }
      
      // Similar logic for target node
      if (targetNode.type === 'decision') {
        if (Math.abs(dx) > Math.abs(dy)) {
          targetEdge = dx > 0 ? 'left' : 'right';
        } else {
          targetEdge = dy > 0 ? 'top' : 'bottom';
        }
      } else {
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          targetEdge = dx > 0 ? 'left' : 'right';
        } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
          targetEdge = dy > 0 ? 'top' : 'bottom';
        } else {
          targetEdge = 'left';
        }
      }
      
      // Set source connection point based on determined edge
      if (sourceNode.type === 'decision') {
        const halfSize = decisionNodeSize / 2;
        switch (sourceEdge) {
          case 'right':
            sourceX = sourceNode.x + halfSize;
            sourceY = sourceNode.y;
            break;
          case 'left':
            sourceX = sourceNode.x - halfSize;
            sourceY = sourceNode.y;
            break;
          case 'top':
            sourceX = sourceNode.x;
            sourceY = sourceNode.y - halfSize;
            break;
          case 'bottom':
            sourceX = sourceNode.x;
            sourceY = sourceNode.y + halfSize;
            break;
        }
      } else {
        switch (sourceEdge) {
          case 'right':
            sourceX = sourceNode.x + nodeWidth;
            sourceY = sourceNode.y + nodeHeight / 2;
            break;
          case 'left':
            sourceX = sourceNode.x;
            sourceY = sourceNode.y + nodeHeight / 2;
            break;
          case 'top':
            sourceX = sourceNode.x + nodeWidth / 2;
            sourceY = sourceNode.y;
            break;
          case 'bottom':
            sourceX = sourceNode.x + nodeWidth / 2;
            sourceY = sourceNode.y + nodeHeight;
            break;
        }
      }
      
      // Set target connection point based on determined edge
      if (targetNode.type === 'decision') {
        const halfSize = decisionNodeSize / 2;
        switch (targetEdge) {
          case 'left':
            targetX = targetNode.x - halfSize;
            targetY = targetNode.y;
            break;
          case 'right':
            targetX = targetNode.x + halfSize;
            targetY = targetNode.y;
            break;
          case 'top':
            targetX = targetNode.x;
            targetY = targetNode.y - halfSize;
            break;
          case 'bottom':
            targetX = targetNode.x;
            targetY = targetNode.y + halfSize;
            break;
        }
      } else {
        switch (targetEdge) {
          case 'left':
            targetX = targetNode.x;
            targetY = targetNode.y + nodeHeight / 2;
            break;
          case 'right':
            targetX = targetNode.x + nodeWidth;
            targetY = targetNode.y + nodeHeight / 2;
            break;
          case 'top':
            targetX = targetNode.x + nodeWidth / 2;
            targetY = targetNode.y;
            break;
          case 'bottom':
            targetX = targetNode.x + nodeWidth / 2;
            targetY = targetNode.y + nodeHeight;
            break;
        }
      }
      
      // Determine if we need a custom curve for better path routing
      let pathData;
      const isHorizontalSource = sourceEdge === 'left' || sourceEdge === 'right';
      const isHorizontalTarget = targetEdge === 'left' || targetEdge === 'right';
      const isVerticalSource = sourceEdge === 'top' || sourceEdge === 'bottom';
      const isVerticalTarget = targetEdge === 'top' || targetEdge === 'bottom';
      
      // Create an appropriate path based on connection geometry
      if ((isHorizontalSource && isHorizontalTarget) || 
          (isVerticalSource && isVerticalTarget)) {
        // Similar edge types - use simple curve
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        
        pathData = `M${sourceX},${sourceY} 
                   C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
      } else {
        // Mixed edge types (e.g., horizontal to vertical) - use more complex curve
        // Create intermediate points for smoother routing
        let control1X, control1Y, control2X, control2Y;
        
        if (isHorizontalSource) {
          // Source is horizontal (left/right), target is vertical (top/bottom)
          const offset = 40;
          control1X = sourceX + (sourceEdge === 'right' ? offset : -offset);
          control1Y = sourceY;
          control2X = targetX;
          control2Y = targetY + (targetEdge === 'bottom' ? -offset : offset);
        } else {
          // Source is vertical (top/bottom), target is horizontal (left/right)
          const offset = 40;
          control1X = sourceX;
          control1Y = sourceY + (sourceEdge === 'bottom' ? offset : -offset);
          control2X = targetX + (targetEdge === 'right' ? -offset : offset);
          control2Y = targetY;
        }
        
        pathData = `M${sourceX},${sourceY} 
                   C${control1X},${control1Y} ${control2X},${control2Y} ${targetX},${targetY}`;
      }
      
      // Draw the path with the calculated data
      const path = g.append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrowhead)');
      
      // Add connection label if present
      if (connection.label) {
        // Put label at midpoint of path
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        
        // Add a white background for better readability
        const labelWidth = connection.label.length * 7 + 10; // Approximate width based on text length
        
        g.append('rect')
          .attr('x', midX - labelWidth/2)
          .attr('y', midY - 10)
          .attr('width', labelWidth)
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
      <div className="relative w-full overflow-hidden border rounded-md" style={{ height }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
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
            <span className="text-xs">Data Provider Actions</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
            <span className="text-xs">Data Recipient Actions</span>
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

// Main exported component with responsive wrapper and error boundary
export function ClaimsProcessFlowChart({ className }: { className?: string }) {
  return (
    <ChartErrorBoundary chartName="Claims Process Flow Chart">
      <ResponsiveChartWrapper
        minWidth={400}
        minHeight={300}
        aspectRatio={1.6} // 16:10 aspect ratio
        className={className}
      >
        {({ width, height }) => (
          <ClaimsProcessFlowChartInternal 
            width={width} 
            height={height} 
            className={className} 
          />
        )}
      </ResponsiveChartWrapper>
    </ChartErrorBoundary>
  );
}
