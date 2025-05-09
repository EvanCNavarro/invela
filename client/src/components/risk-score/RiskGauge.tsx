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
 * Converts polar coordinates to cartesian coordinates
 */
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

/**
 * Creates an SVG arc path description
 */
const describeArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(x, y, endAngle);
  const end = polarToCartesian(x, y, startAngle);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
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
  const height = size / 2;
  const radius = size * 0.4; // Gauge arc radius
  const centerX = width / 2;
  const centerY = height;
  const strokeWidth = size * 0.12; // Thickness of the gauge track
  
  // Convert percentage to angle (180-0 degrees, with 180 being the left side)
  // For a half-circle, 0% = 180° (left), 50% = 90° (top), 100% = 0° (right)
  const startAngle = 180;
  const endAngle = 180 - (percentage / 100) * 180;
  
  return (
    <div style={{ position: 'relative', width: width, height: height * 1.6, margin: '0 auto' }}>
      {/* SVG containing the gauge */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background arc (light gray) - full half-circle */}
        <path
          d={`M ${centerX - radius}, ${centerY} A ${radius}, ${radius}, 0, 1, 1, ${centerX + radius}, ${centerY}`}
          fill="none"
          stroke="#e5e7eb" // Light gray background
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Colored arc that grows as percentage increases */}
        {percentage > 0 && (
          <path
            d={`M ${centerX - radius}, ${centerY} A ${radius}, ${radius}, 0, ${percentage > 50 ? 1 : 0}, 1, ${
              centerX - radius + 2 * radius * (percentage / 100)
            }, ${
              centerY - Math.sin((percentage / 100) * Math.PI) * radius
            }`}
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
        top: height + 15,
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