/**
 * RiskGauge Component
 * 
 * A half-circle gauge visualization that uses a mix of SVG and dynamic imports
 * to avoid SSR and React hydration issues.
 */
import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

// We'll dynamically load ReactApexChart like in ComparativeVisualization.tsx
let ReactApexChart: any;

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
  const [chartComponentLoaded, setChartComponentLoaded] = useState(false);
  
  // Log component render if logger exists
  if (logger) {
    logger('gauge', `Rendering half-circle gauge with score: ${score}, level: ${riskLevel}`);
  }
  
  // Calculate the color based on risk level
  const color = getRiskLevelColor(riskLevel);
  
  // Load ApexCharts component only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-apexcharts').then((mod) => {
        ReactApexChart = mod.default;
        setChartComponentLoaded(true);
      }).catch(err => {
        console.error("Error loading ApexCharts:", err);
      });
    }
  }, []);

  // Create the half-circle gauge chart options
  const gaugeOptions = {
    chart: {
      fontFamily: 'Inter, sans-serif',
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    plotOptions: {
      radialBar: {
        startAngle: -180,
        endAngle: 0,
        hollow: {
          size: '65%'
        },
        track: {
          background: '#f1f5f9',
          strokeWidth: '100%'
        },
        dataLabels: {
          name: {
            show: false
          },
          value: {
            offsetY: -10,
            fontSize: `${size/5}px`,
            fontWeight: 600,
            color: '#333',
            formatter: function() {
              return score.toString();
            }
          }
        }
      }
    },
    fill: {
      type: 'solid',
      colors: [color]
    },
    stroke: {
      lineCap: 'round'
    },
    labels: [''],
    grid: {
      padding: {
        bottom: 0
      }
    }
  };

  // Create the series data with the score
  const series = [score];

  // If the chart component is still loading, show a skeleton
  if (!chartComponentLoaded) {
    return (
      <div style={{ width: size, height: size/2, margin: '0 auto' }}>
        <Skeleton className="w-full h-full rounded-full" />
      </div>
    );
  }
  
  return (
    <div style={{ 
      width: size, 
      height: size / 2 + 40, 
      margin: '0 auto', 
      position: 'relative', 
      textAlign: 'center'
    }}>
      <ReactApexChart
        options={gaugeOptions}
        series={series}
        type="radialBar"
        height={size}
        width={size}
      />
      
      {/* Min and max labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '90%',
        marginLeft: '5%',
        marginTop: -10,
        fontSize: size / 15,
        color: '#666'
      }}>
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
};