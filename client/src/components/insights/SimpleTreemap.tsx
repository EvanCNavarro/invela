import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  INSIGHT_COLORS, 
  getCategoryColor, 
  getRiskColor, 
  getRevenueTierColor,
  getAccreditationColor 
} from '@/lib/insightDesignSystem';
import { InsightLoadingSkeleton } from './InsightLoadingSkeleton';

interface TreemapNode {
  name: string;
  value: number;
  category: string;
  revenue_tier: string;
  risk_score: number;
  num_employees?: number;
  accreditation_status?: string;
  revenue_value?: string;
}

/**
 * Get numeric value for revenue calculation
 */
const getRevenueValue = (revenueTier: string): number => {
  switch (revenueTier?.toLowerCase()) {
    case 'small': return 1000000;
    case 'medium': return 25000000;
    case 'large': return 100000000;
    default: return 5000000;
  }
};

/**
 * Format revenue value for display
 */
const formatRevenueValue = (value: string | number | undefined): string => {
  if (!value) return 'N/A';
  
  if (typeof value === 'string') {
    if (value.startsWith('$')) return value;
    const num = parseInt(value);
    if (isNaN(num)) return value;
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  
  return `$${(value / 1000000).toFixed(1)}M`;
};

export default function SimpleTreemap() {
  // Fetch network data
  const { data: networkData, isLoading } = useQuery({
    queryKey: ['/api/network/visualization'],
    refetchOnMount: true,
  });

  // Transform network data into treemap nodes
  const treemapData = useMemo(() => {
    if (!networkData?.nodes?.length) return [];
    
    return networkData.nodes.map((node: any) => ({
      name: node.name || 'Unknown Company',
      value: getRevenueValue(node.revenueTier || node.revenue_tier),
      category: node.category || 'Unknown',
      revenue_tier: node.revenueTier || node.revenue_tier || 'small',
      risk_score: node.riskScore || node.risk_score || 0,
      num_employees: node.numEmployees || node.num_employees,
      accreditation_status: node.accreditationStatus || node.accreditation_status,
      revenue_value: node.revenue || node.revenue_value
    }));
  }, [networkData]);

  // Show standardized loading skeleton
  if (isLoading) {
    return <InsightLoadingSkeleton variant="network" animationDelay={0} />;
  }

  // Handle no data case
  if (!treemapData.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No network data available</p>
          <p className="text-sm">Companies will appear here once network data is loaded</p>
        </div>
      </div>
    );
  }

  // Sort by value for better visualization
  const sortedData = [...treemapData].sort((a, b) => b.value - a.value);

  return (
    <div className="w-full h-full p-4">
      <div className="grid gap-2" style={{ 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gridAutoRows: 'minmax(100px, auto)'
      }}>
        {sortedData.slice(0, 50).map((node, index) => {
          const size = Math.max(100, Math.min(300, node.value / 500000)); // Scale based on value
          const color = getCategoryColor(node.category);
          
          return (
            <div
              key={`${node.name}-${index}`}
              className="relative border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              style={{
                backgroundColor: `${color}15`,
                borderColor: color,
                minHeight: `${Math.max(80, size / 3)}px`
              }}
            >
              {/* Company name */}
              <div className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
                {node.name}
              </div>
              
              {/* Company details */}
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span>{node.category}</span>
                </div>
                
                <div>Revenue: {formatRevenueValue(node.revenue_value)}</div>
                
                {node.num_employees && (
                  <div>{node.num_employees.toLocaleString()} employees</div>
                )}
                
                <div className="flex items-center gap-2">
                  <span>Risk:</span>
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getRiskColor(node.risk_score) }}
                  />
                  <span>{node.risk_score}</span>
                </div>
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-max">
                <div className="space-y-1">
                  <div className="font-medium">{node.name}</div>
                  <div>Type: {node.category}</div>
                  <div>Size: {node.num_employees?.toLocaleString() || 'N/A'} employees</div>
                  <div>Revenue Tier: {node.revenue_tier}</div>
                  <div>ARR: {formatRevenueValue(node.revenue_value)}</div>
                  <div>Risk Score: {node.risk_score}</div>
                  <div>Accreditation: {node.accreditation_status || 'Unknown'}</div>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary footer */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {Math.min(50, sortedData.length)} of {sortedData.length} companies
      </div>
    </div>
  );
}