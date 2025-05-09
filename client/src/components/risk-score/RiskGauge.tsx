/**
 * RiskGauge Component
 * 
 * A half-circle gauge visualization using pure CSS/SVG for compatibility and stability
 */
import React from 'react';

interface RiskGaugeProps {
  score: number;
  riskLevel: string;
  size?: number;
  logger?: (context: string, message: string, data?: any) => void;
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
 * Half-circle gauge component
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  score, 
  riskLevel, 
  size = 150,
  logger 
}) => {
  // Log component render if logger exists
  if (logger) {
    logger('gauge', `Rendering half-circle gauge with score: ${score}, level: ${riskLevel}`);
  }
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Calculate the percentage of the circle to fill
  const percentage = Math.min(Math.max(score, 0), 100);
  
  // Calculate the stroke-dasharray and stroke-dashoffset for the SVG arc
  const radius = size * 0.4;
  const circumference = radius * Math.PI;
  const dashArray = `${circumference} ${circumference}`;
  const dashOffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div style={{ 
      width: size, 
      height: size / 2 + 20, 
      margin: '0 auto', 
      position: 'relative', 
      textAlign: 'center'
    }}>
      <svg 
        width={size} 
        height={size / 2 + 10} 
        viewBox={`0 0 ${size} ${size / 2 + 10}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background arc (gray) */}
        <path
          d={`M ${size * 0.1} ${size / 2} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={size * 0.1}
          strokeLinecap="round"
        />
        
        {/* Colored arc representing the score */}
        <path
          d={`M ${size * 0.1} ${size / 2} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.1}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          transform={`rotate(-180 ${size / 2} ${size / 2})`}
        />
        
        {/* Min label (0) */}
        <text
          x={size * 0.1}
          y={size * 0.6}
          fontSize={size * 0.08}
          fill="#666"
          textAnchor="middle"
        >
          0
        </text>
        
        {/* Max label (100) */}
        <text
          x={size * 0.9}
          y={size * 0.6}
          fontSize={size * 0.08}
          fill="#666"
          textAnchor="middle"
        >
          100
        </text>
      </svg>
      
      {/* Score display in the center */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, 0%)',
        fontSize: size / 4,
        fontWeight: 'bold',
        color: '#333'
      }}>
        {score}
      </div>
    </div>
  );
};