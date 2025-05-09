/**
 * RiskGauge Component
 * 
 * A half-circle gauge visualization that displays risk scores with gradient coloring
 * based on risk level. Built using Recharts for consistency with other visualizations
 * in the application.
 */
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RiskGaugeProps {
  /**
   * The risk score value (0-100)
   */
  score: number;
  
  /**
   * The current risk level label ('none', 'low', 'medium', 'high', 'critical')
   */
  riskLevel: string;
  
  /**
   * Optional size of the gauge in pixels
   */
  size?: number;
  
  /**
   * Optional logger function for debugging
   */
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
 * RiskGauge component that renders a half-circle gauge visualization
 * for risk scores with color highlighting based on risk level
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  score, 
  riskLevel, 
  size = 150,
  logger
}) => {
  // Log component render with score and level if logger exists
  if (logger) {
    logger('gauge', `Rendering risk gauge with score: ${score}, level: ${riskLevel}`);
  }

  // Data for the gauge visualization
  // We create a half-circle by setting startAngle and endAngle
  // and using two data segments: the filled portion and the empty portion
  const data = useMemo(() => {
    // Calculate the filled angle (score percentage of 180 degrees)
    const filledAngle = (score / 100) * 180;
    
    return [
      // Filled segment (colored based on risk level)
      { name: 'score', value: filledAngle },
      // Empty segment (gray)
      { name: 'remaining', value: 180 - filledAngle }
    ];
  }, [score]);

  // Calculate the risk level color for the filled segment
  const color = getRiskLevelColor(riskLevel);

  // Create a linear gradient for a more visually appealing gauge
  const gradientId = `riskGaugeGradient-${score}`;
  
  return (
    <div style={{ width: size, height: size/2 + 10, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Define a linear gradient based on risk level */}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          
          {/* Gauge background (light gray arc) */}
          <Pie
            data={[{ name: 'background', value: 180 }, { name: 'empty', value: 180 }]}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.55}
            outerRadius={size * 0.45}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill="#f1f5f9" /> {/* Slate-100 for background */}
            <Cell fill="transparent" /> {/* Transparent second half */}
          </Pie>
          
          {/* Gauge fill (colored arc based on score) */}
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.55}
            outerRadius={size * 0.45}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={`url(#${gradientId})`} /> {/* Gradient fill for score */}
            <Cell fill="transparent" /> {/* Transparent for remaining */}
          </Pie>
          
          {/* Gauge needle indicator */}
          <Pie
            data={[{ name: 'needle', value: 1 }]}
            cx="50%"
            cy="100%"
            startAngle={90 - (score / 100) * 180}
            endAngle={90 - (score / 100) * 180}
            innerRadius={0}
            outerRadius={size * 0.48}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={color} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};