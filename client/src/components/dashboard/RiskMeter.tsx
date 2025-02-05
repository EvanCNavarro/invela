import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface RiskMeterProps {
  score: number;
  className?: string;
}

export function RiskMeter({ score = 0, className }: RiskMeterProps) {
  const [mounted, setMounted] = useState(false);
  const normalizedScore = Math.min(Math.max(0, score), 1500);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: 'bg-gray-100 text-gray-800' };
    if (score <= 250) return { level: 'Low Risk', color: 'bg-blue-100 text-blue-800' };
    if (score <= 501) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
    if (score <= 1001) return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
    return { level: 'Critical Risk', color: 'bg-red-100 text-red-800' };
  };

  const { level, color } = getRiskLevel(normalizedScore);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'radialBar',
      offsetY: -20,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: "#e7e7e7",
          strokeWidth: '97%',
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false
          },
          value: {
            offsetY: -2,
            fontSize: '22px'
          }
        }
      }
    },
    grid: {
      padding: {
        top: -10
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        shadeIntensity: 0.4,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 50, 53, 91]
      },
    },
    labels: ['Risk Score'],
  };

  const series = [Math.round((normalizedScore / 1500) * 100)];

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="w-64 h-48">
        {mounted && (
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="radialBar"
            height={250}
          />
        )}
      </div>

      <div className="text-center mt-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-semibold mb-2"
        >
          {normalizedScore}
        </motion.div>
        <div className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          color
        )}>
          {level}
        </div>
      </div>
    </div>
  );
}