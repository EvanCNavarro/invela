/**
 * RiskGauge Component
 * 
 * Uses Plotly.js to create a gauge chart that matches the design.
 */
import React, { useEffect, useRef } from 'react';
// @ts-ignore
import Plotly from 'plotly.js-dist-min';
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ResponsiveChartWrapper } from '@/components/ui/responsive-chart-wrapper';

interface RiskGaugeProps {
  score: number;
  riskLevel: string;
  size?: number;
  width?: number;
  height?: number;
}

/**
 * Returns the color for a given risk level using a blue-centric color palette
 * 
 * This function creates a cohesive color scheme based on our brand's primary blue color,
 * using saturation and lightness variations to indicate risk levels while maintaining
 * visual consistency across the application.
 */
const getRiskLevelColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'critical':
      return '#2563eb'; // Primary blue - Critical risk (stronger, more saturated blue)
    case 'high':
      return '#3b82f6'; // Blue-500 - High risk (standard blue)
    case 'medium':
      return '#60a5fa'; // Blue-400 - Medium risk (lighter blue)
    case 'low':
      return '#93c5fd'; // Blue-300 - Low risk (pale blue)
    case 'none':
    default:
      return '#cbd5e1'; // Slate-300 - No risk or default (cool gray)
  }
};

/**
 * Internal component that renders the RiskGauge with responsive dimensions
 */
function RiskGaugeInternal({ 
  score, 
  riskLevel, 
  size = 320,
  width = 320,
  height = 240
}: RiskGaugeProps) {
  // Reference to the div that will contain the Plotly chart
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Simple console log for debugging
  console.log(`[RiskScore:gauge] Rendering with score: ${score}, level: ${riskLevel}`);
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Create and update the chart when component mounts or props change
  useEffect(() => {
    if (chartRef.current) {
      // Create a gradient background effect by defining steps on the gauge
      const steps = [
        { range: [0, 25], color: '#f0f9ff' },    // Blue-50 - Very light blue
        { range: [25, 50], color: '#e0f2fe' },   // Blue-100 - Light blue
        { range: [50, 75], color: '#bae6fd' },   // Blue-200 - Pale blue
        { range: [75, 100], color: '#93c5fd' }   // Blue-300 - Slightly darker blue
      ];
      
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
            tickcolor: '#cbd5e1',  // Slate-300 - Cool gray for subtle ticks
            tickfont: {
              size: 10,
              color: '#64748b'     // Slate-500 - Cool gray for text
            },
            visible: true,
            showticklabels: true,
            // Only show specific ticks
            tickvals: [0, 25, 50, 75, 100],
            // Only show values at 0 and 100
            ticktext: ['0', '', '', '', '100']
          },
          bar: { color, thickness: 0.8 },
          bgcolor: 'rgba(0,0,0,0)',  // Transparent background to show gradient steps
          borderwidth: 0,
          bordercolor: 'transparent',
          steps: steps  // Add the gradient steps
        },
        // Display the value in the center of the gauge with black color as requested
        number: {
          font: {
            family: 'Inter, sans-serif',
            size: Math.max(width * 0.15, 24), // Responsive number size with minimum
            color: '#000000', // Black color for better visibility
            weight: 'bold'
          },
          suffix: '',
          prefix: ''
        },
        // Title for additional text near the gauge
        title: {
          text: '',
          font: {
            family: 'Inter, sans-serif',
            size: 14,
            color: '#64748b'  // Slate-500 - Cool gray text
          }
        }
      }];
      
      // Layout configuration for the chart
      const layout = {
        // Configure layout for a half-circle gauge
        margin: { t: 40, b: 10, l: 30, r: 30 },
        width: width,
        height: height,
        font: {
          family: 'Arial, sans-serif',
          size: Math.max(width / 25, 12), // Responsive font size with minimum
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
  }, [score, riskLevel, color, width, height]);
  
  return (
    <div style={{ position: 'relative', width: width, height: height, margin: '0 auto' }}>
      {/* The div that will contain the Plotly chart */}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

/**
 * Responsive RiskGauge component with error boundary
 * Automatically adapts to container dimensions and provides graceful error handling
 */
export function RiskGauge({ 
  score, 
  riskLevel, 
  className 
}: { 
  score: number; 
  riskLevel: string; 
  className?: string; 
}) {
  return (
    <ChartErrorBoundary>
      <ResponsiveChartWrapper className={className}>
        {({ width, height }) => (
          <RiskGaugeInternal
            score={score}
            riskLevel={riskLevel}
            width={width}
            height={height}
          />
        )}
      </ResponsiveChartWrapper>
    </ChartErrorBoundary>
  );
};