import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Sankey,
  Rectangle
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ResponsiveChartWrapper } from '@/components/ui/responsive-chart-wrapper';

interface SankeyNode {
  id: string;
  name: string;
  category: string;
  count: number;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  sourceColor: string;
  targetColor: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Helper to format nodes and links for the Sankey chart
const formatSankeyData = (data: SankeyData) => {
  // Create a lookup map for node indexes
  const nodeMap = new Map<string, number>();
  data.nodes.forEach((node, index) => {
    nodeMap.set(node.id, index);
  });

  // Transform nodes to the format expected by recharts
  const nodes = data.nodes.map(node => ({
    name: `${node.name} (${node.count})`,
    value: node.count,
    color: node.color,
    category: node.category,
    // Original data for reference
    originalName: node.name,
    originalCount: node.count,
    originalId: node.id
  }));

  // Transform links replacing string IDs with indices
  const links = data.links.map(link => ({
    source: nodeMap.get(link.source) || 0,
    target: nodeMap.get(link.target) || 0,
    value: link.value,
    sourceColor: link.sourceColor,
    targetColor: link.targetColor,
    // For debugging - store original source/target IDs
    originalSource: link.source,
    originalTarget: link.target
  }));

  return { nodes, links };
};

// Custom node shape with count and styling exactly matching the reference design
const CustomNode = ({ x, y, width, height, index, payload }: any) => {
  const { color, name, category } = payload;
  const nodeWidth = Math.max(width, 30); // Ensure minimal width for readability
  
  // Enhanced styling based on category to match reference design precisely
  const getNodeStyle = () => {
    // Base styling for each category - exactly like reference
    if (category === 'companyType') {
      return {
        fill: color,
        stroke: "#000", // Black border for company types
        strokeWidth: 1.5,
        rx: 0,
        ry: 0,
        strokeDasharray: "" // Solid line
      };
    } else if (category === 'accreditationStatus') {
      return {
        fill: color,
        stroke: "#fff", // White dashed border for accreditation
        strokeWidth: 1, 
        rx: 0,
        ry: 0,
        strokeDasharray: "3,3" // Dashed pattern
      };
    } else { // Risk buckets
      return {
        fill: color,
        stroke: "#fff", // White border for risk buckets
        strokeWidth: 0.5,
        rx: 0, // Square corners in the reference
        ry: 0,
        strokeDasharray: ""
      };
    }
  };
  
  // Split name by parentheses to show count on a separate line
  let displayName = name;
  let countText = "";
  
  if (name && name.includes('(')) {
    const parts = name.split(/[()]/);
    displayName = parts[0].trim();
    countText = parts.length > 1 ? parts[1] : "";
  }
  
  const nodeStyle = getNodeStyle();
  
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
        // Apply strokeDasharray as a string attribute directly
        {...(nodeStyle.strokeDasharray ? { 'strokeDasharray': nodeStyle.strokeDasharray } : {})}
        rx={nodeStyle.rx}
        ry={nodeStyle.ry}
      />
      <text
        x={x + nodeWidth / 2}
        y={y + height / 2 - (countText ? 8 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontWeight="bold"
        fontSize={12}
        stroke="#fff"
        strokeWidth={0.5}
        paintOrder="stroke"
      >
        {displayName}
      </text>
      {countText && (
        <text
          x={x + nodeWidth / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={10}
        >
          {countText}
        </text>
      )}
    </g>
  );
};

// Custom link shape with gradient coloring - perfectly matching reference design
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
  const gradientId = `linkGradient${index}`;
  
  // Calculate the midpoint with an offset to create asymmetric curves like in the reference
  // The reference design has more pronounced curves with flatter sections near the nodes
  const xDistance = targetX - sourceX;
  const midX = sourceX + xDistance * 0.5;
  
  // Control points to create more pronounced curves with flatter sections near nodes
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

// Custom tooltip for showing detailed information
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // For node tooltips
  if (payload[0].payload.category) {
    const { name, category, value } = payload[0].payload;
    const categoryLabel = category === 'companyType' ? 'Company Type' : 
                         category === 'accreditationStatus' ? 'Accreditation Status' : 
                         'Risk Bucket';
    
    return (
      <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-gray-600">{categoryLabel}</p>
        <p className="text-sm">Count: {value}</p>
      </div>
    );
  }
  
  // For link tooltips
  try {
    // Check if source and target exist and have name property
    const sourceNode = payload[0].payload.source;
    const targetNode = payload[0].payload.target;
    const value = payload[0].value;
    
    // Ensure both source and target nodes are defined and have a name property
    if (!sourceNode || !targetNode || typeof sourceNode.name === 'undefined' || typeof targetNode.name === 'undefined') {
      return (
        <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
          <p className="font-semibold">Connection Details</p>
          <p className="text-sm">Count: {value}</p>
        </div>
      );
    }
    
    return (
      <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
        <p className="font-semibold">Connection Details</p>
        <p className="text-sm">From: {sourceNode.name}</p>
        <p className="text-sm">To: {targetNode.name}</p>
        <p className="text-sm">Count: {value}</p>
      </div>
    );
  } catch (error) {
    // Fallback if there's any error in parsing the tooltip data
    return (
      <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
        <p className="font-semibold">Connection Details</p>
        <p className="text-sm">Value: {payload[0].value || 'N/A'}</p>
      </div>
    );
  }
};

interface RiskFlowVisualizationProps {
  width?: number;
  height?: number;
}

function RiskFlowVisualizationInternal({ width = 900, height = 650 }: RiskFlowVisualizationProps) {
  const { data, isLoading, error } = useQuery<SankeyData>({
    queryKey: ['/api/risk-flow-visualization'],
  });
  
  // Customize data to better match the reference design proportions
  const [formattedData, setFormattedData] = useState<{
    nodes: { name: string; value: number; color: string; category: string }[];
    links: { source: number; target: number; value: number; sourceColor: string; targetColor: string }[];
  } | null>(null);

  useEffect(() => {
    if (data) {
      // Process the data to match reference design proportions
      const processedData = formatSankeyData(data);
      
      // Ensure a minimum value for visibility of smaller nodes in the design
      // This matches the reference where small nodes are still clearly visible
      processedData.nodes = processedData.nodes.map(node => {
        // Ensure minimum size for better visibility like in reference design
        return {
          ...node,
          value: Math.max(node.value, node.value * 1.5)
        };
      });
      
      setFormattedData(processedData);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Skeleton className="h-96 w-full" />
        <div className="text-center mt-4">
          <p className="text-gray-500">Loading Risk Flow Visualization...</p>
        </div>
      </div>
    );
  }

  if (error || !formattedData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-500">Error loading risk flow data</p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (formattedData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-lg font-semibold">No Data Available</p>
          <p className="text-sm text-gray-500 mt-2">
            There are no relationships to visualize. Add company relationships to see this visualization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-2">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold">Risk Flow Visualization</h3>
        <p className="text-sm text-muted-foreground">
          Flow diagram showing relationships between company types, accreditation statuses, and risk buckets
        </p>
      </div>
      
      <div className="h-[650px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={formattedData}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={60}
            nodeWidth={40} // Match reference design
            margin={{ top: 20, right: 60, bottom: 60, left: 60 }}
            iterations={512} // More iterations for better layout
            direction="horizontal"
            width={900}
            height={600}
          >
            <defs>
              {/* Gradients are created in the CustomLink component */}
            </defs>
            <RechartsTooltip content={<CustomTooltip />} />
          </Sankey>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-center mt-4 text-sm gap-6">
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#4965EC' }}></span>
          <span>Invela</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#0C195B' }}></span>
          <span>Data Provider</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#C2C4EA' }}></span>
          <span>Data Recipient</span>
        </div>
        <div className="flex items-center">
          <span className="mx-2">|</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#FFFFFF', border: '1px solid black' }}></span>
          <span>No Risk (0)</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#82C091' }}></span>
          <span>Low Risk (1-33)</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#F9CB9C' }}></span>
          <span>Medium Risk (34-66)</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#F28C77' }}></span>
          <span>High Risk (67-99)</span>
        </div>
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#DB4325' }}></span>
          <span>Critical Risk (100)</span>
        </div>
      </div>
    </div>
  );
}