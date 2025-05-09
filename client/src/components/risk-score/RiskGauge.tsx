/**
 * RiskGauge Component
 * 
 * A pure SVG half-circle gauge visualization without any dependencies.
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
 * Half-circle gauge component using pure SVG
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
  const height = size / 2 + 20;
  const radius = size * 0.4;
  const centerX = width / 2;
  const centerY = height * 0.4; // Position circle at the top
  const strokeWidth = size * 0.08;
  
  // Calculate the angles for the progress arc
  const startAngle = 0; // Starting from 0 radians (right side)
  const endAngle = percentage * Math.PI / 100; // Convert percentage to radians (0 to π)
  
  // Function to calculate point on the arc
  const getPoint = (angle: number) => {
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY - radius * Math.sin(angle) // Negative to flip upside down
    };
  };
  
  // Calculate start and end points
  const start = getPoint(0); // Right side (0 degrees)
  const end = getPoint(endAngle);
  
  // Determine if we need to use the large arc flag
  const largeArcFlag = percentage > 50 ? 1 : 0;
  
  // Create the path for the colored progress arc
  const progressPath = `
    M ${start.x},${start.y}
    A ${radius},${radius} 0 ${largeArcFlag},1 ${end.x},${end.y}
  `;
  
  // Create the path for the background (gray) arc
  const backgroundPath = `
    M ${centerX - radius},${centerY}
    A ${radius},${radius} 0 0,1 ${centerX + radius},${centerY}
  `;
  
  return (
    <div style={{ position: 'relative', width: width, height: height * 2.5, margin: '0 auto' }}>
      {/* SVG containing the arc */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background arc (gray) */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="#f1f5f9"
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
        
        {/* Min label (0) */}
        <text
          x={centerX - radius}
          y={centerY + 25}
          fontSize={size * 0.06}
          fill="#666"
          textAnchor="middle"
        >
          0
        </text>
        
        {/* Max label (100) */}
        <text
          x={centerX + radius}
          y={centerY + 25}
          fontSize={size * 0.06}
          fill="#666"
          textAnchor="middle"
        >
          100
        </text>
      </svg>
      
      {/* Score value */}
      <div style={{
        position: 'absolute',
        top: height + 30,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: size / 3.5,
        fontWeight: 'bold',
        color: '#333'
      }}>
        {score}
      </div>
      
      {/* Risk Acceptance Level text */}
      <div style={{
        position: 'absolute',
        top: height - 10,
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