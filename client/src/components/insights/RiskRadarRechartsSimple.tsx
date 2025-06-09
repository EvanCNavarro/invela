import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RiskRadarRechartsSimpleProps {
  className?: string;
  data?: { category: string; value: number; fullMark: number }[];
  companyName?: string;
}

export function RiskRadarRechartsSimple({ 
  className, 
  data = [
    { category: 'Cyber Security', value: 5, fullMark: 10 },
    { category: 'Financial Stability', value: 4, fullMark: 10 },
    { category: 'Potential Liability', value: 8, fullMark: 10 },
    { category: 'Dark Web Data', value: 3, fullMark: 10 },
    { category: 'Public Sentiment', value: 5, fullMark: 10 },
    { category: 'Data Access Scope', value: 6, fullMark: 10 }
  ],
  companyName = 'BankingAPI Gateway'
}: RiskRadarRechartsSimpleProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Risk Radar (Recharts)</CardTitle>
        <p className="text-sm text-muted-foreground">{companyName}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fontSize: 10, fontWeight: 600 }}
                className="text-gray-700"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 10]} 
                tick={{ fontSize: 8 }}
                tickCount={6}
                className="text-gray-500"
              />
              <Radar
                name="Risk Score"
                dataKey="value"
                stroke="#4965EC"
                fill="#4965EC"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 4, fill: '#4965EC' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}