import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number;
  className?: string;
}

export function RiskMeter({ score = 0, className }: RiskMeterProps) {
  const normalizedScore = Math.min(Math.max(0, score), 1500);

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: 'bg-gray-100 text-gray-800' };
    if (score <= 250) return { level: 'Low Risk', color: 'bg-blue-100 text-blue-800' };
    if (score <= 501) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
    if (score <= 1001) return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
    return { level: 'Critical Risk', color: 'bg-red-100 text-red-800' };
  };

  const { level, color } = getRiskLevel(normalizedScore);

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-6xl font-bold mb-4"
      >
        {normalizedScore}
      </motion.div>
      <div className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        color
      )}>
        {level}
      </div>
    </div>
  );
}