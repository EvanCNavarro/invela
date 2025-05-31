import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface RiskMeterProps {
  score: number;
  chosenScore?: number;
  className?: string;
  companyId: number;
  companyType?: string;
  canAdjust?: boolean;
  readonly?: boolean;
}

export function RiskMeter({ 
  score = 0, 
  chosenScore, 
  className, 
  companyId, 
  companyType = "FinTech"
}: RiskMeterProps) {
  // Ensure the score is within the 0-100 range
  const systemScore = Math.min(Math.max(0, score), 100);
  // Use system score or chosen score, whichever is available
  const displayScore = chosenScore ?? systemScore;
  
  const queryClient = useQueryClient();

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: 'bg-gray-100 text-gray-800' };
    if (score <= 33) return { level: 'Low Risk', color: 'bg-[hsl(209,99%,50%)] text-white' };
    if (score <= 66) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
    if (score <= 99) return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
    return { level: 'Critical Risk', color: 'bg-red-100 text-red-800' };
  };

  const { level, color } = getRiskLevel(displayScore);
  
  // Tooltip content for info icon
  const tooltipContent = "This is the system-calculated risk score";

  return (
    <div className={cn("flex flex-col items-center justify-center py-4", className)}>
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-6xl font-bold mb-2"
        >
          {displayScore}
        </motion.div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-5 w-5 text-gray-400 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        color
      )}>
        {level}
      </div>
    </div>
  );
}