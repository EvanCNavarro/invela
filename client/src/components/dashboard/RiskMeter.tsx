import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, InfoIcon } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  companyType = "FinTech", 
  canAdjust = false,
  readonly = false
}: RiskMeterProps) {
  // Ensure the score is within the 0-100 range
  const systemScore = Math.min(Math.max(0, score), 100);
  const [currentScore, setCurrentScore] = useState<number>(chosenScore ?? systemScore);
  const [isDragging, setIsDragging] = useState(false);
  const [previousValue, setPreviousValue] = useState<number>(currentScore);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update internal state if props change
  useEffect(() => {
    setCurrentScore(chosenScore ?? systemScore);
    setPreviousValue(chosenScore ?? systemScore);
  }, [chosenScore, systemScore]);

  // Define mutation for updating the chosen score
  const updateScoreMutation = useMutation({
    mutationFn: async (newScore: number) => {
      return apiRequest('PATCH', `/api/companies/${companyId}/score`, { chosen_score: newScore });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      toast({
        title: "Score updated",
        description: "The risk score has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      // Revert to previous value if update fails
      setCurrentScore(previousValue);
      toast({
        title: "Failed to update score",
        description: "There was an error updating the risk score. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating score:", error);
    }
  });

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: 'bg-gray-100 text-gray-800' };
    if (score <= 33) return { level: 'Low Risk', color: 'bg-[hsl(209,99%,50%)] text-white' };
    if (score <= 66) return { level: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
    if (score <= 99) return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
    return { level: 'Critical Risk', color: 'bg-red-100 text-red-800' };
  };

  const { level, color } = getRiskLevel(currentScore);
  
  // Calculate slider limits
  const minValue = 0;
  const maxValue = Math.min(systemScore + 10, 100); // Max is either 10 above anchor or 100
  
  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    setCurrentScore(value[0]);
    setIsDragging(true);
  };

  // Handle slider release
  const handleSliderRelease = () => {
    if (isDragging) {
      setPreviousValue(currentScore);
      updateScoreMutation.mutate(currentScore);
      setIsDragging(false);
    }
  };

  // Reset to the system-calculated score
  const handleReset = () => {
    setPreviousValue(systemScore);
    setCurrentScore(systemScore);
    updateScoreMutation.mutate(systemScore);
  };

  // Tooltip content logic
  const tooltipContent = currentScore !== systemScore 
    ? `Invela's suggested 'S&P Business Data Access Risk Score': ${systemScore}` 
    : "This is the system-calculated risk score";

  // Determine if we should show the adjustable slider
  const showSlider = canAdjust && (companyType === "Bank" || companyType === "Invela") && !readonly;

  // For fintech or readonly view, use the simple version
  if (!showSlider) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-4", className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-6xl font-bold mb-2"
        >
          {currentScore}
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

  // For adjustable view (banks and Invela)
  return (
    <div className={cn("flex flex-col items-center justify-center py-4 px-2", className)}>
      <div className="w-full flex items-center justify-center mb-6 relative">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-6xl font-bold"
                >
                  {currentScore}
                </motion.div>
                <InfoIcon className="h-5 w-5 text-gray-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4",
        color
      )}>
        {level}
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setCurrentScore(Math.max(minValue, currentScore - 10))}
            onMouseUp={handleSliderRelease}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 px-2">
            <Slider
              value={[currentScore]}
              min={minValue}
              max={maxValue}
              step={1}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderRelease}
              className="cursor-pointer"
            />
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setCurrentScore(Math.min(maxValue, currentScore + 10))}
            onMouseUp={handleSliderRelease}
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{minValue}</span>
          {currentScore !== systemScore && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset} 
              className="h-7 text-xs px-2"
            >
              Reset to {systemScore}
            </Button>
          )}
          <span>{maxValue}</span>
        </div>
      </div>
    </div>
  );
}