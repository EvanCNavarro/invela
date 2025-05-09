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
  logger?: any; // Make logger optional and any type to avoid issues
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
  // Don't use logger at all to avoid issues
  // Just log to console directly for debugging
  console.log(`[RiskScore:gauge] Rendering with score: ${score}, level: ${riskLevel}`);
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Calculate the percentage of the circle to fill (0-100)
  const percentage = Math.min(Math.max(score, 0), 100);
  
  // Calculate dimensions
  const width = size;
  const height = size / 2 + 30;
  const radius = size * 0.4;
  const centerX = width / 2;
  const centerY = height * 0.3; // Position circle at the top
  const strokeWidth = size * 0.08;
  
  // Calculate the angle for the progress arc (upside down semi-circle)
  const startAngle = 0; // Starting from 0 radians (right side)
  const endAngle = startAngle + (percentage / 100) * Math.PI; // Going counter-clockwise
  
  // Function to calculate point on the arc
  const polarToCartesian = (angle: number) => {
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY - radius * Math.sin(angle) // Negative to flip upside down
    };
  };
  
  // Calculate points for the progress arc
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  
  // Determine if we need to use the large arc flag
  const largeArcFlag = percentage > 50 ? 1 : 0;
  
  // Create the SVG path for the progress arc
  const arcPath = `
    M ${start.x},${start.y}
    A ${radius},${radius} 0 ${largeArcFlag},1 ${end.x},${end.y}
  `;
  
  // Create the SVG path for the background arc
  const backgroundArcPath = `
    M ${centerX - radius},${centerY}
    A ${radius},${radius} 0 0,1 ${centerX + radius},${centerY}
  `;
    
  return (
    <div style={{ position: 'relative', width: width, height: height, margin: '0 auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Background arc */}
        <path
          d={backgroundArcPath}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d={arcPath}
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
      
      {/* Score number */}
      <div style={{
        position: 'absolute',
        top: height * 0.75,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: size / 4,
        fontWeight: 'bold',
        color: '#333'
      }}>
        {score}
      </div>
      
      {/* Risk Acceptance Level text */}
      <div style={{
        position: 'absolute',
        top: height * 0.55,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: size / 15,
        color: '#666',
        fontWeight: 500
      }}>
        Risk Acceptance Level
      </div>
    </div>
  );
};