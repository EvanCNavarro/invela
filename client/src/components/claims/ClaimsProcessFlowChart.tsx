import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Sankey,
  Rectangle
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface FlowNode {
  name: string;
  category: string;
  value: number;
  color: string;
}

interface FlowLink {
  source: number;
  target: number;
  value: number;
  sourceColor: string;
  targetColor: string;
}

interface ClaimsProcessFlowData {
  nodes: FlowNode[];
  links: FlowLink[];
}

// Custom node component for the claims process flowchart
const CustomNode = ({ x, y, width, height, index, payload }: any) => {
  const { color, name, category } = payload;
  const nodeWidth = Math.max(width, 30); // Ensure minimal width for readability
  
  // Enhanced styling based on category
  const getNodeStyle = () => {
    // Base styling for each category
    switch (category) {
      case 'bank':
        return {
          fill: color,
          stroke: "#2563eb", // Blue border
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
          strokeDasharray: ""
        };
      case 'fintech':
        return {
          fill: color,
          stroke: "#7c3aed", // Purple border
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
          strokeDasharray: ""
        };
      case 'decision':
        return {
          fill: color,
          stroke: "#eab308", // Yellow border
          strokeWidth: 1.5,
          rx: 0, // Diamond shape handled separately
          ry: 0,
          strokeDasharray: ""
        };
      case 'process':
        return {
          fill: color,
          stroke: "#10b981", // Green border
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
          strokeDasharray: ""
        };
      case 'breach':
        return {
          fill: color,
          stroke: "#ef4444", // Red border
          strokeWidth: 1.5,
          rx: 4,
          ry: 4,
          strokeDasharray: ""
        };
      default:
        return {
          fill: color,
          stroke: "#64748b", // Slate border
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          strokeDasharray: ""
        };
    }
  };
  
  const nodeStyle = getNodeStyle();
  
  // For decision nodes, we want to render a diamond shape
  if (category === 'decision') {
    // Create a diamond shape using a rotated rectangle
    const centerX = x + nodeWidth / 2;
    const centerY = y + height / 2;
    const diamondWidth = Math.max(nodeWidth, height) * 0.8;
    const diamondHeight = diamondWidth;
    
    return (
      <g transform={`translate(${centerX}, ${centerY})`}>
        <g transform="rotate(45)">
          <rect
            x={-diamondWidth / 2}
            y={-diamondHeight / 2}
            width={diamondWidth}
            height={diamondHeight}
            fill={color}
            stroke={nodeStyle.stroke}
            strokeWidth={nodeStyle.strokeWidth}
            strokeDasharray={nodeStyle.strokeDasharray || ''}
          />
        </g>
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontWeight="bold"
          fontSize={12}
          stroke="#fff"
          strokeWidth={0.5}
          paintOrder="stroke"
        >
          {name}
        </text>
      </g>
    );
  }
  
  // Regular rectangular nodes
  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={nodeWidth}
        height={height}
        fill={color}
        fillOpacity="1"
        stroke={nodeStyle.stroke}
        strokeWidth={nodeStyle.strokeWidth}
        strokeDasharray={nodeStyle.strokeDasharray || ''}
        rx={nodeStyle.rx}
        ry={nodeStyle.ry}
      />
      <text
        x={x + nodeWidth / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontWeight="bold"
        fontSize={12}
        stroke="#fff"
        strokeWidth={0.5}
        paintOrder="stroke"
      >
        {name}
      </text>
    </g>
  );
};

// Custom link/connection between nodes
const CustomLink = (props: any) => {
  const { 
    sourceX, 
    targetX, 
    sourceY, 
    targetY, 
    sourceControlX, 
    targetControlX, 
    linkWidth, 
    index, 
    payload 
  } = props;
  
  // Default colors if payload colors are missing
  const sourceColor = payload.sourceColor || '#4965EC';
  const targetColor = payload.targetColor || '#82C091';
  const gradientId = `flow-link-gradient-${index}`;
  
  // Calculate the midpoint for smooth curves
  const xDistance = targetX - sourceX;
  const midX = sourceX + xDistance * 0.5;
  
  // Control points for smooth curves
  const sourceControlPointX = sourceX + xDistance * 0.2;  // Closer to source
  const targetControlPointX = targetX - xDistance * 0.2;  // Closer to target
  
  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={sourceColor} stopOpacity={0.95} />
          <stop offset="40%" stopColor={sourceColor} stopOpacity={0.85} />
          <stop offset="60%" stopColor={targetColor} stopOpacity={0.85} />
          <stop offset="100%" stopColor={targetColor} stopOpacity={0.95} />
        </linearGradient>
      </defs>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlPointX},${sourceY} ${targetControlPointX},${targetY} ${targetX},${targetY}
          L${targetX},${targetY + linkWidth}
          C${targetControlPointX},${targetY + linkWidth} ${sourceControlPointX},${sourceY + linkWidth} ${sourceX},${sourceY + linkWidth}
          Z
        `}
        fill={`url(#${gradientId})`}
        stroke="none"
        opacity={0.9}
      />
    </g>
  );
};

// Custom tooltip for the flowchart
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // For node tooltips
  if (payload[0].payload.category) {
    const { name, category } = payload[0].payload;
    let categoryLabel = '';
    
    switch (category) {
      case 'bank':
        categoryLabel = 'Bank Action';
        break;
      case 'fintech':
        categoryLabel = 'FinTech Action';
        break;
      case 'decision':
        categoryLabel = 'Decision Point';
        break;
      case 'process':
        categoryLabel = 'Process';
        break;
      case 'breach':
        categoryLabel = 'Data Breach';
        break;
      default:
        categoryLabel = 'Step';
    }
    
    return (
      <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-gray-600">{categoryLabel}</p>
      </div>
    );
  }
  
  // For link tooltips
  try {
    const sourceNode = payload[0].payload.source;
    const targetNode = payload[0].payload.target;
    
    if (!sourceNode || !targetNode) {
      return (
        <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
          <p className="font-semibold">Process Flow</p>
        </div>
      );
    }
    
    return (
      <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
        <p className="font-semibold">Process Flow</p>
        <p className="text-sm">From: {sourceNode.name}</p>
        <p className="text-sm">To: {targetNode.name}</p>
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
        <p className="font-semibold">Process Flow</p>
      </div>
    );
  }
};

// Helper function to prepare the data for the Sankey diagram
const prepareClaimsProcessData = (): ClaimsProcessFlowData => {
  // Define nodes with appropriate categories and colors
  const nodes = [
    { name: 'Data Breach', category: 'breach', value: 20, color: '#fee2e2' },  // index 0
    { name: 'Bank Files Claim', category: 'bank', value: 20, color: '#dbeafe' },  // index 1
    { name: 'FinTech Response', category: 'fintech', value: 20, color: '#ede9fe' },  // index 2
    { name: 'Disputed?', category: 'decision', value: 20, color: '#fef3c7' },  // index 3
    { name: 'Process Payment', category: 'process', value: 20, color: '#d1fae5' },  // index 4
    { name: 'Dispute Resolution', category: 'process', value: 20, color: '#fef9c3' },  // index 5
    { name: 'Who is Liable?', category: 'decision', value: 20, color: '#fef3c7' },  // index 6
    { name: 'Bank Liable', category: 'bank', value: 15, color: '#dbeafe' },  // index 7
    { name: 'Shared Liability', category: 'process', value: 15, color: '#fef9c3' },  // index 8
    { name: 'FinTech Liable', category: 'fintech', value: 15, color: '#ede9fe' },  // index 9
    { name: 'Close Claim', category: 'process', value: 20, color: '#d1fae5' },  // index 10
  ];

  // Define links between nodes
  const links = [
    // Initial process
    { source: 0, target: 1, value: 10, sourceColor: '#fee2e2', targetColor: '#dbeafe' },
    { source: 1, target: 2, value: 10, sourceColor: '#dbeafe', targetColor: '#ede9fe' },
    { source: 2, target: 3, value: 10, sourceColor: '#ede9fe', targetColor: '#fef3c7' },
    
    // Decision split - Disputed?
    { source: 3, target: 4, value: 5, sourceColor: '#fef3c7', targetColor: '#d1fae5' }, // No dispute path
    { source: 3, target: 5, value: 5, sourceColor: '#fef3c7', targetColor: '#fef9c3' }, // Yes dispute path
    
    // Payment path
    { source: 4, target: 10, value: 5, sourceColor: '#d1fae5', targetColor: '#d1fae5' },
    
    // Dispute resolution to liability decision
    { source: 5, target: 6, value: 5, sourceColor: '#fef9c3', targetColor: '#fef3c7' },
    
    // Liability decision outcomes
    { source: 6, target: 7, value: 1.5, sourceColor: '#fef3c7', targetColor: '#dbeafe' },
    { source: 6, target: 8, value: 1.5, sourceColor: '#fef3c7', targetColor: '#fef9c3' },
    { source: 6, target: 9, value: 1.5, sourceColor: '#fef3c7', targetColor: '#ede9fe' },
    
    // All liability outcomes to close claim
    { source: 7, target: 10, value: 1.5, sourceColor: '#dbeafe', targetColor: '#d1fae5' },
    { source: 8, target: 10, value: 1.5, sourceColor: '#fef9c3', targetColor: '#d1fae5' },
    { source: 9, target: 10, value: 1.5, sourceColor: '#ede9fe', targetColor: '#d1fae5' },
  ];

  return { nodes, links };
};

interface ClaimsProcessFlowChartProps {
  className?: string;
}

export function ClaimsProcessFlowChart({ className }: ClaimsProcessFlowChartProps) {
  const [flowData, setFlowData] = useState<ClaimsProcessFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setFlowData(prepareClaimsProcessData());
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
      <div className="h-[550px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={flowData}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={30}
            nodeWidth={35}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
            iterations={64}
            width={900}
            height={500}
          >
            <RechartsTooltip content={<CustomTooltip />} />
          </Sankey>
        </ResponsiveContainer>
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
