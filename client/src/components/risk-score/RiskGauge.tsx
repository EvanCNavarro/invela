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
 * Creates an SVG arc path for a gauge that grows from left to right
 * 
 * @param centerX - X center point of the arc
 * @param centerY - Y center point of the arc (bottom of half-circle)
 * @param radius - Radius of the arc
 * @param percentage - Value from 0-100
 */
const createGaugeArc = (
  centerX: number, 
  centerY: number, 
  radius: number, 
  percentage: number = 0
): string => {
  // Ensure percentage is between 0-100
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Convert percentage to radians (flipped for left-to-right)
  // At 0%, we start at π (180 degrees - left side)
  // At 100%, we end at 0 degrees (right side)
  
  // Calculate the angle (in radians) based on percentage
  const angle = (normalizedPercentage / 100) * Math.PI;
  
  // Calculate start and end points
  const startX = centerX - radius; // Always start from left side
  const startY = centerY;
  const endX = centerX - radius * Math.cos(angle); // Flipped x-coordinate calculation
  const endY = centerY - radius * Math.sin(angle);
  
  // Determine if the arc should be drawn the long way around
  const largeArcFlag = normalizedPercentage > 50 ? 1 : 0;
  
  // Create the SVG path string
  // M = moveto, A = elliptical arc
  // Changed the sweep flag to 1 (clockwise direction)
  return `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
  `;
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
  
  // Create the full background arc (0 to 100%)
  const backgroundPath = createGaugeArc(centerX, centerY, radius, 100);
  
  // Create the colored progress arc (0 to percentage%)
  const progressPath = createGaugeArc(centerX, centerY, radius, percentage);
  
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