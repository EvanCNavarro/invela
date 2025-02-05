import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis
} from "recharts";

interface RiskMeterProps {
  score: number;
  className?: string;
}

export function RiskMeter({ score = 0, className }: RiskMeterProps) {
  const [mounted, setMounted] = useState(false);
  const normalizedScore = Math.min(Math.max(0, score), 1500);

  useEffect(() => {
    setMounted(true);
    console.log("RiskMeter mounted with score:", normalizedScore); // Debug log
  }, []);

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: 'bg-gray-100 text-gray-800' };
    if (score <= 250) return { level: 'Low Risk', color: 'bg-blue-100 text-blue-800' };
    if (score <= 501) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
    if (score <= 1001) return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
    return { level: 'Critical Risk', color: 'bg-red-100 text-red-800' };
  };

  const { level, color } = getRiskLevel(normalizedScore);

  const data = [
    {
      name: 'Risk Score',
      value: normalizedScore,
      fill: '#0ea5e9'
    }
  ];

  console.log("Rendering RiskMeter with data:", data); // Debug log

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="w-64 h-40">
        <ResponsiveContainer width="100%" height={500}>
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius={60}
            outerRadius={100}
            barSize={10}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 1500]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background
              dataKey="value"
              cornerRadius={30}
              fill="#0ea5e9"
            />
          </RadialBarChart>
        </ResponsiveContainer>
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