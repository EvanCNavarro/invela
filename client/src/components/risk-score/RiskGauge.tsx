/**
 * RiskGauge Component
 * 
 * A half-circle gauge visualization that displays risk scores with gradient coloring
 * based on risk level.
 */
import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';

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
  
  // Data for the gauge - convert score to an angle (180 = half circle)
  // For a half-circle, we need two data points:
  // 1. The filled portion (based on score)
  // 2. The empty portion (remaining)
  const filledValue = (score / 100) * 180;
  const emptyValue = 180 - filledValue;
  
  const data = [
    { name: 'filled', value: filledValue },
    { name: 'empty', value: emptyValue }
  ];
  
  return (
    <div style={{ 
      width: size, 
      height: size / 2 + 30, 
      margin: '0 auto', 
      position: 'relative', 
      textAlign: 'center'
    }}>
      {/* Half-circle gauge */}
      <PieChart width={size} height={size}>
        {/* Background gray arc */}
        <Pie
          data={[{ name: 'bg', value: 180 }]}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.6 / 2}
          outerRadius={size * 0.8 / 2}
          paddingAngle={0}
          dataKey="value"
        >
          <Cell fill="#f1f5f9" />
        </Pie>
        
        {/* Colored arc based on score */}
        <Pie
          data={data}
          cx={size / 2}
          cy={size / 2}
          startAngle={180}
          endAngle={0}
          innerRadius={size * 0.6 / 2}
          outerRadius={size * 0.8 / 2}
          paddingAngle={0}
          dataKey="value"
        >
          <Cell fill={color} />
          <Cell fill="transparent" />
        </Pie>
      </PieChart>
      
      {/* Score display in the center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, 0%)',
        fontSize: size / 4,
        fontWeight: 'bold',
        color: '#333'
      }}>
        {score}
      </div>
      
      {/* Min and max labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: -10,
        fontSize: size / 12,
        color: '#666'
      }}>
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
};