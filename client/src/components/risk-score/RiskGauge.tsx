/**
 * RiskGauge Component
 * 
 * A pure SVG half-circle gauge visualization without any dependencies.
 * Matches the design in the reference image with a thick line and number inside the gauge.
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
  // Convert from degrees to radians
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180;
  
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

/**
 * Creates an SVG Arc path description
 * Based on best practices for drawing circular arcs with SVG
 */
const describeArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  
  // Determine if the arc should be drawn the long way around
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  
  // Create the SVG arc path string
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
};

/**
 * Half-circle gauge component using pure SVG with score in the center
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
  const radius = size * 0.35; // Slightly smaller radius for the number to fit better
  const centerX = width / 2;
  const centerY = height;
  const strokeWidth = size * 0.12; // Make the stroke thicker like in the reference image
  
  // Maps percentage (0-100) to angle (180-0) for the half-circle
  // At 0%, angle is 180 (left)
  // At 50%, angle is 90 (top)
  // At 100%, angle is 0 (right)
  const startAngle = 180;
  const endAngle = 180 - (percentage / 100) * 180;
  
  // Create arc paths using the describeArc helper
  const backgroundPath = describeArc(centerX, centerY, radius, 0, 180);
  const progressPath = describeArc(centerX, centerY, radius, endAngle, 180);
  
  return (
    <div style={{ position: 'relative', width: width, height: height * 1.6, margin: '0 auto' }}>
      {/* SVG containing the gauge */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background arc (light gray) - full half-circle */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Progress arc (colored) */}
        <path
          d={progressPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
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
          x={centerX - radius - 6}
          y={centerY + 20}
          fontSize={size * 0.05}
          fill="#666"
          textAnchor="middle"
        >
          0
        </text>
        
        {/* Max label (100) */}
        <text
          x={centerX + radius + 6}
          y={centerY + 20}
          fontSize={size * 0.05}
          fill="#666"
          textAnchor="middle"
        >
          100
        </text>
      </svg>
      
      {/* Risk Acceptance Level text - now below the gauge */}
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