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
import { TrendingDown, TrendingUp, Minus, ArrowRight, ArrowDown, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  calculateRiskStatus, 
  getRiskStatusColor,
  type RiskMonitoringStatus 
} from '@/lib/riskCalculations';


// Import shared type from risk calculations service
import type { CompanyRiskData } from '@/lib/riskCalculations';

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

// Status calculation and styling now handled by shared service

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
  
  // Process companies with authentic data only
  const processedCompanies = useMemo(() => {
    logTable('Processing companies with authentic data only', { 
      timeframe, 
      companyCount: companies.length 
    });
    
    // Process each company with authentic risk status
    const processed = companies.map(company => {
      // Use authentic risk status based on current score vs threshold
      const status = company.currentScore < blockThreshold ? 'Blocked' : 'Stable';
      
      // Since we don't have historical data, score change is always 0
      const scoreChange = 0;
      
      return {
        ...company,
        scoreChange,
        status
      };
    });
    
    // Sort by current score (lowest first to show highest risk companies)
    return processed.sort((a, b) => a.currentScore - b.currentScore);
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
 * Sort types for the columns
 */
type SortField = 'name' | 'currentScore' | 'scoreChange' | 'status' | null;
type SortDirection = 'asc' | 'desc';

/**
 * Internal table component that displays the company data
 */
const RiskTable: React.FC<{
  companies: (CompanyRiskData & { scoreChange: number; status: string })[];
  onCompanyClick?: (companyId: number) => void;
}> = ({ companies, onCompanyClick }) => {
  // Add sorting state
  const [sortConfig, setSortConfig] = useState<{field: SortField, direction: SortDirection}>({
    field: 'scoreChange',
    direction: 'desc'
  });

  // Handle column sort
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => {
      // If clicking the same field, toggle direction
      if (prevConfig.field === field) {
        return {
          field,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // If clicking a new field, default to descending
      return {
        field,
        direction: 'desc'
      };
    });

    // Log the sorting change
    logTable('Sorting changed', { field, direction: sortConfig.direction });
  };

  // Sort companies based on current sort configuration
  const sortedCompanies = useMemo(() => {
    if (!sortConfig.field) return companies;

    return [...companies].sort((a, b) => {
      if (sortConfig.field === 'name') {
        return sortConfig.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      if (sortConfig.field === 'currentScore') {
        return sortConfig.direction === 'asc'
          ? a.currentScore - b.currentScore
          : b.currentScore - a.currentScore;
      }
      
      if (sortConfig.field === 'scoreChange') {
        return sortConfig.direction === 'asc'
          ? a.scoreChange - b.scoreChange
          : b.scoreChange - a.scoreChange;
      }
      
      if (sortConfig.field === 'status') {
        const statusOrder = { 'Blocked': 0, 'Approaching Block': 1, 'Monitoring': 2, 'Stable': 3 };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder];
        const bOrder = statusOrder[b.status as keyof typeof statusOrder];
        
        return sortConfig.direction === 'asc'
          ? aOrder - bOrder
          : bOrder - aOrder;
      }
      
      return 0;
    });
  }, [companies, sortConfig]);

  if (companies.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No companies with deteriorating risk scores found.
      </div>
    );
  }

  // Helper to render the sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ChevronDown className="inline-block ml-1 h-4 w-4 text-muted-foreground opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="inline-block ml-1 h-4 w-4 text-primary" />
      : <ChevronDown className="inline-block ml-1 h-4 w-4 text-primary" />;
  };

  return (
    <div className="border rounded-md relative">
      {/* Table with automatic height based on content */}
      <div className="overflow-visible">
        <Table>
          {/* Sticky header that remains visible during scroll */}
          <TableHeader className="sticky top-0 z-20 bg-white border-b">
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none bg-white"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Company Name {renderSortIndicator('name')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer select-none bg-white"
                onClick={() => handleSort('currentScore')}
              >
                <div className="flex items-center justify-end">
                  Current DARS {renderSortIndicator('currentScore')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer select-none bg-white"
                onClick={() => handleSort('scoreChange')}
              >
                <div className="flex items-center justify-end">
                  Score Change {renderSortIndicator('scoreChange')}
                </div>
              </TableHead>
              <TableHead className="text-center bg-white">Trend</TableHead>
              <TableHead 
                className="cursor-pointer select-none bg-white"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status {renderSortIndicator('status')}
                </div>
              </TableHead>
              <TableHead className="w-[50px] bg-white"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCompanies.map((company) => (
              <TableRow 
                key={company.id}
                className={cn(
                  onCompanyClick ? "cursor-pointer transition-colors hover:bg-slate-50/70" : ""
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
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    getRiskStatusColor(company.status as RiskMonitoringStatus)
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
    </div>
  );
};

export default DeterioratingRiskTable;