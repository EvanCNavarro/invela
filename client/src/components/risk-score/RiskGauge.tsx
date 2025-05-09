/**
 * RiskGauge Component
 * 
 * A pure SVG half-circle gauge visualization without any dependencies.
 * Matches the design with a gray background and colored arc that grows.
 */
import React from 'react';

interface RiskGaugeProps {
  score: number;
  riskLevel: string;
  size?: number;
}

/**
 * Returns the color for a given risk level
 */
const getRiskLevelColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'critical':
      return '#ef4444'; // Red-500 - Critical risk
    case 'high':
      return '#f97316'; // Orange-500 - High risk
    case 'medium':
      return '#eab308'; // Yellow-500 - Medium risk
    case 'low':
      return '#22c55e'; // Green-500 - Low risk
    case 'none':
    default:
      return '#94a3b8'; // Slate-400 - No risk or default
  }
};

/**
 * Creates an SVG arc path for a half circle from 0 to percentage
 */
const createArcPath = (centerX: number, centerY: number, radius: number, percentage: number): string => {
  // Start at the leftmost point of the circle
  const startX = centerX - radius;
  const startY = centerY;
  
  // For a half-circle going clockwise:
  // 0% is at 180 degrees (left)
  // 100% is at 0 degrees (right)
  // We need to calculate the ending point based on the percentage
  const endAngle = Math.PI * (1 - percentage / 100);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY - radius * Math.sin(endAngle);
  
  // For percentages > 50%, the arc is more than half of the half-circle,
  // so we need to set the large-arc-flag to 1
  const largeArcFlag = percentage > 50 ? 1 : 0;
  
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
};

/**
 * Half-circle gauge component using pure SVG with growing colored arc
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  score, 
  riskLevel, 
  size = 220
}) => {
  // Simple console log for debugging
  console.log(`[RiskScore:gauge] Rendering with score: ${score}, level: ${riskLevel}`);
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Calculate the percentage of the circle to fill (0-100)
  const percentage = Math.min(Math.max(score, 0), 100);
  
  // Calculate dimensions
  const width = size;
  const height = size / 2 + 30; // Add some space below for labels
  const radius = size * 0.4; // Gauge arc radius
  const centerX = width / 2;
  const centerY = height - 30; // Center point at the bottom of the semicircle
  const strokeWidth = size * 0.12; // Thickness of the gauge track
  
  // Create the background arc (full half-circle)
  const backgroundArc = createArcPath(centerX, centerY, radius, 100);
  
  // Create the colored progress arc
  const progressArc = createArcPath(centerX, centerY, radius, percentage);
  
  return (
    <div style={{ position: 'relative', width: width, height: height * 1.4, margin: '0 auto' }}>
      {/* SVG containing the gauge */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background arc (light gray) - full half-circle */}
        <path
          d={backgroundArc}
          fill="none"
          stroke="#e5e7eb" // Light gray background
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Colored arc that grows as percentage increases */}
        {percentage > 0 && (
          <path
            d={progressArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        
        {/* Score value inside the gauge */}
        <text
          x={centerX}
          y={centerY - radius * 0.3} // Position inside the arc
          fontSize={size * 0.18}
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {score}
        </text>
        
        {/* Min label (0) */}
        <text
          x={centerX - radius - 10}
          y={centerY + 20}
          fontSize={size * 0.05}
          fill="#666"
          textAnchor="middle"
        >
          0
        </text>
        
        {/* Max label (100) */}
        <text
          x={centerX + radius + 10}
          y={centerY + 20}
          fontSize={size * 0.05}
          fill="#666"
          textAnchor="middle"
        >
          100
        </text>
      </svg>
      
      {/* Risk Acceptance Level text - below the gauge */}
      <div style={{
        position: 'absolute',
        top: height - 5,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: size / 18,
        color: '#666',
        fontWeight: 500
      }}>
        Risk Acceptance Level
      </div>
    </div>
  );
};