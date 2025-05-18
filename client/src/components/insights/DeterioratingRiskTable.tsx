/**
 * DeterioratingRiskTable Component
 *
 * A table that displays Data Recipients with declining DARS (Data Access Risk Scores).
 * Provides toggle between 7-day and 30-day views and sorts by greatest negative change.
 */

import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus, ArrowRight } from 'lucide-react';


// Define the types for our data
export interface CompanyRiskData {
  id: number;
  name: string;
  currentScore: number;
  previousScore: number;
  category: string;
}

interface DeterioratingRiskTableProps {
  companies: CompanyRiskData[];
  blockThreshold: number;
  className?: string;
  onCompanyClick?: (companyId: number) => void;
  timeframe: '7day' | '30day';
}

/**
 * Logger for the Deteriorating Risk Table component
 */
const logTable = (action: string, details?: any) => {
  console.log(`[DeterioratingRiskTable] ${action}`, details || '');
};

/**
 * Calculate the status based on score and threshold
 */
const calculateStatus = (
  currentScore: number, 
  previousScore: number, 
  threshold: number
): 'Stable' | 'Monitoring' | 'Approaching Block' | 'Blocked' => {
  // If below threshold, the company is blocked
  if (currentScore < threshold) {
    return 'Blocked';
  }
  
  // Calculate percentage to threshold
  const percentToThreshold = ((currentScore - threshold) / (100 - threshold)) * 100;
  
  // Significant negative trend
  const hasDeteriorated = previousScore - currentScore > 5;
  
  if (percentToThreshold < 20 && hasDeteriorated) {
    return 'Approaching Block';
  } else if (hasDeteriorated) {
    return 'Monitoring';
  }
  
  return 'Stable';
};

/**
 * Get the color for the status badge
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Blocked':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Approaching Block':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Monitoring':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Stable':
    default:
      return 'bg-green-100 text-green-800 border-green-200';
  }
};

/**
 * DeterioratingRiskTable Component
 */
const DeterioratingRiskTable: React.FC<DeterioratingRiskTableProps> = ({
  companies,
  blockThreshold,
  className,
  onCompanyClick,
  timeframe
}) => {
  
  // Filtered and sorted companies based on the time frame and score change
  const processedCompanies = useMemo(() => {
    // Log the calculation process
    logTable('Processing companies data', { 
      timeframe, 
      companyCount: companies.length 
    });
    
    // Apply a multiplier to simulate different deterioration amounts
    // for 7-day vs 30-day views
    const deteriorationMultiplier = timeframe === '7day' ? 1 : 3;
    
    // Process each company to calculate score changes and status
    const processed = companies.map(company => {
      // Calculate score change - adjust based on timeframe
      // In a real implementation, we would use actual historical data
      const scoreChange = (company.previousScore - company.currentScore) * 
                          deteriorationMultiplier;
      
      // Calculate status
      const status = calculateStatus(
        company.currentScore, 
        company.previousScore, 
        blockThreshold
      );
      
      return {
        ...company,
        scoreChange,
        status
      };
    });
    
    // Sort by the greatest negative change (most deteriorated first)
    return processed.sort((a, b) => b.scoreChange - a.scoreChange);
  }, [companies, timeframe, blockThreshold]);
  
  return (
    <div className={cn("space-y-4", className)}>
      <RiskTable 
        companies={processedCompanies} 
        onCompanyClick={onCompanyClick} 
      />
    </div>
  );
};

/**
 * Internal table component that displays the company data
 */
const RiskTable: React.FC<{
  companies: (CompanyRiskData & { scoreChange: number; status: string })[];
  onCompanyClick?: (companyId: number) => void;
}> = ({ companies, onCompanyClick }) => {
  if (companies.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No companies with deteriorating risk scores found.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead className="text-right">Current DARS</TableHead>
            <TableHead className="text-right">Score Change</TableHead>
            <TableHead className="text-center">Trend</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow 
              key={company.id}
              className={cn(
                onCompanyClick ? "cursor-pointer hover:bg-muted/50" : "",
                company.status === 'Blocked' ? "bg-red-50" : ""
              )}
              onClick={() => onCompanyClick && onCompanyClick(company.id)}
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell className="text-right">{company.currentScore}</TableCell>
              <TableCell className={cn(
                "text-right font-medium",
                company.scoreChange > 0 ? "text-red-600" : 
                company.scoreChange < 0 ? "text-green-600" : ""
              )}>
                {company.scoreChange > 0 ? `-${company.scoreChange.toFixed(1)}` : 
                 company.scoreChange < 0 ? `+${Math.abs(company.scoreChange).toFixed(1)}` : 
                 '0.0'}
              </TableCell>
              <TableCell className="text-center">
                {company.scoreChange > 0 ? (
                  <TrendingDown className="h-5 w-5 mx-auto text-red-500" />
                ) : company.scoreChange < 0 ? (
                  <TrendingUp className="h-5 w-5 mx-auto text-green-500" />
                ) : (
                  <Minus className="h-5 w-5 mx-auto text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium border",
                  getStatusColor(company.status)
                )}>
                  {company.status}
                </span>
              </TableCell>
              <TableCell>
                {onCompanyClick && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeterioratingRiskTable;