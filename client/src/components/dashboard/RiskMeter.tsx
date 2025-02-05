import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number;
  maxScore?: number;
}

export function RiskMeter({ score = 0, maxScore = 1500 }: RiskMeterProps) {
  const [mounted, setMounted] = useState(false);
  const normalizedScore = Math.min(Math.max(0, score), maxScore);
  const angle = (normalizedScore / maxScore) * 180 - 90; // -90 to 90 degrees

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

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <svg className="w-full" viewBox="0 0 200 120">
        {/* Gray base arc */}
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* No Risk (Gray) */}
        <path
          d="M20 100 A80 80 0 0 1 60 40"
          fill="none"
          className="stroke-gray-100"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Low Risk (Blue) */}
        <path
          d="M60 40 A80 80 0 0 1 100 28"
          fill="none"
          className="stroke-blue-100"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Medium Risk (Yellow) */}
        <path
          d="M100 28 A80 80 0 0 1 140 40"
          fill="none"
          className="stroke-yellow-100"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* High/Critical Risk (Red) */}
        <path
          d="M140 40 A80 80 0 0 1 180 100"
          fill="none"
          className="stroke-red-100"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Needle */}
        <motion.line
          x1="100"
          y1="100"
          x2="100"
          y2="40"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          initial={{ rotate: -90 }}
          animate={{ rotate: mounted ? angle : -90 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ transformOrigin: "100px 100px" }}
        />

        {/* Center point */}
        <circle
          cx="100"
          cy="100"
          r="4"
          className="fill-foreground"
        />
      </svg>

      {/* Score Display */}
      <div className="text-center mt-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-semibold mb-2"
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