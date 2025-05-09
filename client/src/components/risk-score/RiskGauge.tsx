/**
 * RiskGauge Component - Simplified for testing
 * 
 * A simpler implementation to avoid potential React hooks issues
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
 * Simple gauge component for testing
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  score, 
  riskLevel, 
  size = 150,
  logger 
}) => {
  // Log component render if logger exists
  if (logger) {
    logger('gauge', `Rendering simple risk gauge with score: ${score}, level: ${riskLevel}`);
  }
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Calculate the width of the filled portion
  const fillWidth = (score / 100) * 100;
  
  return (
    <div style={{ width: size, margin: '0 auto', textAlign: 'center' }}>
      {/* Simple gauge visualization */}
      <div style={{ 
        width: '100%', 
        height: 20, 
        backgroundColor: '#f1f5f9', 
        borderRadius: 10,
        overflow: 'hidden',
        margin: '10px 0'
      }}>
        <div style={{ 
          width: `${fillWidth}%`, 
          height: '100%', 
          backgroundColor: color, 
          borderRadius: 10,
          transition: 'width 0.5s ease-in-out'
        }} />
      </div>
      
      {/* Level indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
      
      {/* Score display */}
      <div style={{ 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: color, 
        margin: '10px 0',
        textAlign: 'center'
      }}>
        {score}
      </div>
    </div>
  );
};