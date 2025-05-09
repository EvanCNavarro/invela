/**
 * RiskGauge Component
 * 
 * A pure SVG half-circle gauge visualization without any dependencies.
 * Matches the standard gauge design with a needle pointer.
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
 * Half-circle gauge component using pure SVG with needle pointer
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
  const height = size / 2 + 20; // Add some space for the needle
  const radius = size * 0.35; // Gauge arc radius
  const centerX = width / 2;
  const centerY = height - 20; // Center point at the bottom of the semicircle
  const strokeWidth = size * 0.08; // Thickness of the gauge track
  
  // Calculate the angle for the needle
  // Map 0-100% to 180-0 degrees (left to right in a semicircle)
  const needleAngleRad = ((180 - (percentage / 100) * 180) * Math.PI) / 180;
  
  // Calculate needle endpoint
  const needleLength = radius - 10; // Make the needle slightly shorter than the radius
  const needleX = centerX + needleLength * Math.cos(needleAngleRad);
  const needleY = centerY - needleLength * Math.sin(needleAngleRad);
  
  // Define colors for the gradient sections (red -> orange -> yellow -> light green -> green)
  const colorStops = [
    { offset: "0%", color: "#ef4444" },    // Red (left side)
    { offset: "25%", color: "#f97316" },   // Orange
    { offset: "50%", color: "#eab308" },   // Yellow
    { offset: "75%", color: "#a3e635" },   // Light Green
    { offset: "100%", color: "#22c55e" }   // Green (right side)
  ];
  
  return (
    <div style={{ position: 'relative', width: width, height: height * 1.5, margin: '0 auto' }}>
      {/* SVG containing the gauge */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Define the gradient for the gauge */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {colorStops.map((stop, index) => (
              <stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        
        {/* Main gauge track (colored gradient) */}
        <path
          d={`M ${centerX - radius}, ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Needle base (circle) */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={size * 0.03} 
          fill="#1a2b42" 
          stroke="#fff" 
          strokeWidth="1"
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#1a2b42"
          strokeWidth={size * 0.015}
          strokeLinecap="round"
        />
        
        {/* Score value under the gauge */}
        <text
          x={centerX}
          y={centerY + radius * 0.5} // Position below the gauge
          fontSize={size * 0.16}
          fontWeight="bold"
          fill={color}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {score}
        </text>
        
        {/* Min label (0) */}
        <text
          x={centerX - radius}
          y={centerY + radius * 0.2}
          fontSize={size * 0.05}
          fill="#666"
          textAnchor="middle"
        >
          0
        </text>
        
        {/* Max label (100) */}
        <text
          x={centerX + radius}
          y={centerY + radius * 0.2}
          fontSize={size * 0.05}
          fill="#666"
          textAnchor="middle"
        >
          100
        </text>
      </svg>
      
      {/* Risk Acceptance Level text - now below the gauge and score */}
      <div style={{
        position: 'absolute',
        top: height + 10,
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