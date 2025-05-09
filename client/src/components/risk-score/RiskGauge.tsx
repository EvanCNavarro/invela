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
  
  // Calculate the angle based on the percentage (0-100%)
  const angle = (percentage / 100) * Math.PI; // Convert to radians (0 to π)
  
  // Calculate the end point coordinates
  // For 0%, the end point is the left side of the semicircle
  // For 100%, the end point is the right side of the semicircle
  const endX = centerX + radius * Math.cos(Math.PI - angle);
  const endY = centerY - radius * Math.sin(Math.PI - angle);
  
  // Generate a simple arc path
  // If percentage > 50, the arc is more than half of the semicircle, so we need the "large-arc-flag" set to 1
  const largeArcFlag = percentage > 50 ? 1 : 0;
  
  // Create the path for the background (full half-circle)
  const backgroundPath = `
    M ${centerX - radius}, ${centerY}
    A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}
  `;
  
  // Create the path for the progress arc
  const progressPath = `
    M ${centerX - radius}, ${centerY}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
  `;
  
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