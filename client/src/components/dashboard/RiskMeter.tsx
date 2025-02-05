import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number;
  className?: string;
}

export function RiskMeter({ score = 0, className }: RiskMeterProps) {
  const [mounted, setMounted] = useState(false);
  const normalizedScore = Math.min(Math.max(0, score), 1500);
  const angle = (normalizedScore / 1500) * 180 - 90; // -90 to 90 degrees

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
    <div className={cn("flex flex-col items-center justify-center", className)}>
      {/* Risk Meter SVG */}
      <div className="relative w-64 h-40">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Base track */}
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Risk level segments */}
          <path
            d="M20 100 A80 80 0 0 1 60 40"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M60 40 A80 80 0 0 1 100 28"
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M100 28 A80 80 0 0 1 140 40"
            fill="none"
            stroke="#fef08a"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M140 40 A80 80 0 0 1 180 100"
            fill="none"
            stroke="#fecaca"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Needle */}
          <motion.line
            x1="100"
            y1="100"
            x2="100"
            y2="40"
            stroke="#000000"
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
            fill="#000000"
          />
        </svg>
      </div>

      {/* Score Display */}
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