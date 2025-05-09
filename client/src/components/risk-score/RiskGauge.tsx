/**
 * RiskGauge Component
 * 
 * Uses Plotly.js to create a gauge chart that matches the design.
 */
import React, { useEffect, useRef } from 'react';
// @ts-ignore
import Plotly from 'plotly.js-dist-min';

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
 * Gauge component using Plotly.js for reliable rendering
 */
export const RiskGauge: React.FC<RiskGaugeProps> = ({ 
  score, 
  riskLevel, 
  size = 220
}) => {
  // Reference to the div that will contain the Plotly chart
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Simple console log for debugging
  console.log(`[RiskScore:gauge] Rendering with score: ${score}, level: ${riskLevel}`);
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Create and update the chart when component mounts or props change
  useEffect(() => {
    if (chartRef.current) {
      // Data for the gauge chart
      const data = [{
        type: 'indicator',
        mode: 'gauge+number',
        value: score,
        domain: { x: [0, 1], y: [0, 1] },
        gauge: {
          shape: 'angular',
          // Make the gauge a semi-circle starting at 9 o'clock and ending at 3 o'clock
          startangle: 180,
          endangle: 0,
          axis: { 
            range: [0, 100],
            tickwidth: 1,
            tickcolor: '#e5e7eb',
            tickfont: {
              size: 10,
              color: '#666'
            },
            visible: true,
            showticklabels: true,
            // Only show specific ticks
            tickvals: [0, 25, 50, 75, 100],
            // Only show values at 0 and 100
            ticktext: ['0', '', '', '', '100']
          },
          bar: { color, thickness: 0.8 },
          bgcolor: '#e5e7eb',
          borderwidth: 0,
          bordercolor: 'transparent',
          steps: []
        },
        // Display the value in the center of the gauge
        number: {
          font: {
            family: 'Arial, sans-serif',
            size: size * 0.18,
            color
          },
          suffix: '',
          prefix: ''
        },
        // Title for additional text near the gauge
        title: {
          text: '',
          font: {
            family: 'Arial, sans-serif',
            size: 14,
            color: '#666'
          }
        }
      }];
      
      // Layout configuration for the chart
      const layout = {
        // Configure layout for a half-circle gauge
        margin: { t: 40, b: 10, l: 30, r: 30 },
        width: size,
        height: size / 1.8,
        font: {
          family: 'Arial, sans-serif',
          size: size / 18,
          color: '#666'
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        showlegend: false
      };
      
      // Configuration options
      const config = {
        displayModeBar: false,
        responsive: true
      };
      
      // Render the chart
      Plotly.newPlot(chartRef.current, data, layout, config);
    }
    
    // Clean up the chart when component unmounts
    return () => {
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [score, riskLevel, color, size]);
  
  return (
    <div style={{ position: 'relative', width: size, height: size / 1.5 + 30, margin: '0 auto' }}>
      {/* The div that will contain the Plotly chart */}
      <div ref={chartRef} style={{ width: '100%', height: 'calc(100% - 30px)' }} />
      
      {/* Risk Acceptance Level text - below the gauge */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: size / 18,
        color: '#666',
        fontWeight: 500,
        textAlign: 'center',
        width: '100%'
      }}>
        Risk Acceptance Level
      </div>
    </div>
  );
};