import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartErrorBoundary } from '@/components/ui/chart-error-boundary';
import { ResponsiveChartWrapper } from '@/components/ui/responsive-chart-wrapper';

// Interface for each company in our visualization
interface CompanyDot {
  id: number;
  name: string;
  category: string;
  status: string;
  color: string;
  label: string;
}

// Interface for status mapping info
interface StatusInfo {
  id: string;
  color: string;
  label: string;
  count: number;
}

// Interface for API response
interface AccreditationStatusData {
  companies: CompanyDot[];
  statusCounts: Record<string, number>;
  statusMap: StatusInfo[];
}

// Props interface for the AccreditationDotMatrix component
interface AccreditationDotMatrixProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Internal component that renders the AccreditationDotMatrix with responsive dimensions
 */
function AccreditationDotMatrixInternal({ 
  className = '',
  width = 800,
  height = 600
}: AccreditationDotMatrixProps) {
  const { data, isLoading, error } = useQuery<AccreditationStatusData>({
    queryKey: ["/api/accreditation-status-distribution"],
  });

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [dotSize, setDotSize] = useState(30); // Default dot size

  // Recalculate dot size based on provided dimensions and number of dots
  useEffect(() => {
    if (!data?.companies.length) return;

    const calculateDotSize = () => {
      const containerWidth = width;
      const containerHeight = height;
      
      // Approximate grid: try to fit all dots while maintaining a reasonably square grid
      const totalCompanies = data.companies.length;
      const aspectRatio = containerWidth / containerHeight;
      
      // Calculate columns based on aspect ratio
      const cols = Math.ceil(Math.sqrt(totalCompanies * aspectRatio));
      const rows = Math.ceil(totalCompanies / cols);
      
      // Leave spacing between dots (20% of dot size for gaps)
      const maxDotWidth = containerWidth / cols * 0.8;
      const maxDotHeight = containerHeight / rows * 0.8;
      
      // Choose the smaller of the two to ensure dots fit
      const size = Math.min(maxDotWidth, maxDotHeight, 40); // Cap at 40px max
      
      setDotSize(Math.max(size, 15)); // Minimum dot size of 15px
    };

    calculateDotSize();
  }, [data?.companies.length, width, height]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading accreditation data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <p className="text-red-500">Error loading accreditation data</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate completion percentage
  const approvedCount = data.statusCounts['APPROVED'] || 0;
  const totalCompanies = data.companies.length;
  const approvedPercentage = totalCompanies > 0 
    ? Math.round((approvedCount / totalCompanies) * 100) 
    : 0;

  // Filter companies based on selected status
  const filteredCompanies = selectedStatus 
    ? data.companies.filter(company => company.status === selectedStatus)
    : data.companies;

  return (
    <div className="flex flex-col h-full py-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {data.statusMap.map((status) => (
          <button
            key={status.id}
            className={`flex items-center gap-2 py-1 px-3 rounded-full transition-all ${
              selectedStatus === status.id 
                ? 'ring-2 ring-primary bg-background shadow-sm' 
                : 'hover:bg-muted'
            }`}
            onClick={() => setSelectedStatus(
              selectedStatus === status.id ? null : status.id
            )}
          >
            <span 
              className="inline-block w-3 h-3 rounded-full" 
              style={{ backgroundColor: status.color }}
            />
            <span>{status.label}</span>
            <span className="font-medium">{status.count}</span>
          </button>
        ))}
      </div>

      {/* Dot Matrix Visualization */}
      <div 
        className="flex-1 border rounded-lg p-6 bg-background overflow-hidden"
        style={{ width, height: height - 120 }} // Account for header space
      >
        <div className="grid grid-cols-1 gap-4 h-full">
          <div className="flex flex-wrap gap-2 content-center justify-center">
            {filteredCompanies.map((company) => (
              <TooltipProvider key={company.id} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        backgroundColor: company.color,
                        width: `${dotSize}px`,
                        height: `${dotSize}px`,
                        border: company.status === 'REVOKED' ? '2px solid #ef4444' : 'none'
                      }}
                    >
                      {dotSize >= 24 && (
                        <span className="text-xs text-white truncate max-w-[80%] text-center">
                          {company.name.substring(0, 1)}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">Type: {company.category}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span 
                          className="inline-block w-2 h-2 rounded-full" 
                          style={{ backgroundColor: company.color }}
                        />
                        <span>{company.label}</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Footer */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Accreditation Progress</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold">{approvedPercentage}%</span>
              <span className="text-muted-foreground text-sm mb-1">
                of companies accredited
              </span>
            </div>
            <div className="w-full h-2 bg-muted mt-2 rounded overflow-hidden">
              <div 
                className="h-full bg-primary rounded" 
                style={{ width: `${approvedPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-col gap-2">
              {data.statusMap.map((status) => (
                <div key={status.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="inline-block w-3 h-3 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm">{status.label}</span>
                  </div>
                  <div>
                    <span className="font-medium">{status.count}</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      ({Math.round((status.count / totalCompanies) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Responsive AccreditationDotMatrix component with error boundary
 * Automatically adapts to container dimensions and provides graceful error handling
 */
export function AccreditationDotMatrix({ className }: { className?: string }) {
  return (
    <ChartErrorBoundary>
      <ResponsiveChartWrapper className={className}>
        {({ width, height }) => (
          <AccreditationDotMatrixInternal
            width={width}
            height={height}
            className={className}
          />
        )}
      </ResponsiveChartWrapper>
    </ChartErrorBoundary>
  );
}