import { PureComponent } from "react";
import { 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number;
  className?: string;
  companyName?: string;
}

export function RiskMeter({ score = 0, className, companyName }: RiskMeterProps) {
  const normalizedScore = Math.min(Math.max(0, score), 1500);
  const percentage = (normalizedScore / 1500) * 100;

  const getRiskLevel = (score: number) => {
    if (score === 0) return { level: 'No Risk', color: '#94a3b8' }; // gray
    if (score <= 250) return { level: 'Low Risk', color: '#60a5fa' }; // blue
    if (score <= 501) return { level: 'Medium Risk', color: '#fbbf24' }; // yellow
    if (score <= 1001) return { level: 'High Risk', color: '#f87171' }; // red
    return { level: 'Critical Risk', color: '#ef4444' }; // darker red
  };

  const { level, color } = getRiskLevel(normalizedScore);

  // Create data for the semi-circle
  const data = [
    { name: 'Score', value: percentage },
    { name: 'Remaining', value: 100 - percentage }
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center py-4", className)}>
      <div className="relative w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell key={`cell-0`} fill={color} />
              <Cell key={`cell-1`} fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className="text-4xl font-bold">{normalizedScore}</span>
          <span className="text-sm font-medium text-muted-foreground mt-1">{level}</span>
          {companyName && (
            <span className="text-sm text-muted-foreground mt-4">
              Company Risk Score for: {companyName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}