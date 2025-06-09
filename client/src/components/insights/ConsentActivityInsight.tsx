import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ConsentActivityChart, TimeframeOption } from './ConsentActivityChart';
import { Loader2 } from 'lucide-react';
import { INSIGHT_COLORS } from '@/lib/insightDesignSystem';
import { InsightLoadingSkeleton } from './InsightLoadingSkeleton';

interface ConsentActivityInsightProps {
  className?: string;
}

/**
 * Insight component for Consent Activity visualization
 * Includes company selector dropdown and timeframe toggle
 */
export function ConsentActivityInsight({ className = '' }: ConsentActivityInsightProps) {
  // State for selected company and timeframe
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1year');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  
  // Fetch current company (the logged in user's company)
  const { data: currentCompany, isLoading: isCurrentCompanyLoading } = useQuery<any>({
    queryKey: ['/api/companies/current'],
  });
  
  // Fetch all companies for the dropdown (when current company is Bank or Invela)
  const { data: companies = [], isLoading: isCompaniesLoading } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    enabled: showCompanyDropdown, // Only fetch if dropdown should be shown
  });
  
  // Network data for relationships
  const { data: networkData } = useQuery<any>({
    queryKey: ['/api/network/visualization'],
  });
  
  // Determine if current company is a FinTech (which affects dropdown visibility)
  useEffect(() => {
    if (currentCompany) {
      console.log('[ConsentActivityInsight] Current company category:', currentCompany.category);
      const isFintech = currentCompany.category === 'FinTech';
      
      // FinTechs only see their own data, others can select companies
      setShowCompanyDropdown(!isFintech);
      
      // Default to current company's ID
      setSelectedCompanyId(currentCompany.id);
    }
  }, [currentCompany]);
  
  // Filter companies for the dropdown to only include FinTechs if needed
  const filteredCompanies = useMemo(() => {
    if (!companies || companies.length === 0) return [];
    
    // Include network relationships if available
    if (networkData && networkData.nodes && networkData.nodes.length > 0) {
      const networkNodes = networkData.nodes
        .filter((node: any) => node.category === 'FinTech')
        .map((node: any) => ({
          id: node.id,
          name: node.name,
          category: node.category
        }));
      
      // Combine with companies and remove duplicates
      const allCompanies = [...companies, ...networkNodes];
      const uniqueCompanies = Array.from(
        new Map(allCompanies.map(company => [company.id, company])).values()
      );
      
      // Sort alphabetically by name
      return uniqueCompanies.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // If no network data, just show all companies
    return companies.sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, networkData]);
  
  // Handle company selection change
  const handleCompanyChange = (companyId: string) => {
    console.log('[ConsentActivityInsight] Company selected:', companyId);
    setSelectedCompanyId(parseInt(companyId, 10));
  };
  
  // Handle timeframe selection change
  const handleTimeframeChange = (value: string) => {
    if (value === '1day' || value === '30days' || value === '1year') {
      console.log('[ConsentActivityInsight] Timeframe changed:', value);
      setTimeframe(value);
    }
  };
  
  // Show standardized loading skeleton
  if (isCurrentCompanyLoading || (showCompanyDropdown && isCompaniesLoading)) {
    return <InsightLoadingSkeleton variant="chart" animationDelay={100} />;
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Data Legend - first in order */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: INSIGHT_COLORS.primary.blue }}></div>
            <span className="text-gray-600">Active Consents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: INSIGHT_COLORS.primary.green }}></div>
            <span className="text-gray-600">Newly Granted</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Company dropdown - second in order */}
          {showCompanyDropdown && (
            <Select
              value={selectedCompanyId?.toString()}
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger className="w-full sm:w-[200px] text-sm">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {filteredCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    <span className="truncate max-w-[150px] block" title={company.name}>
                      {company.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Timeframe toggle group - last */}
          <ToggleGroup
            type="single"
            value={timeframe}
            onValueChange={handleTimeframeChange}
            className="justify-start border rounded-md p-1 bg-muted/30"
            variant="outline"
          >
            <ToggleGroupItem 
              value="1day" 
              aria-label="1 Day view" 
              className="text-sm px-3 py-1 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300"
            >
              1D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="30days" 
              aria-label="30 Days view" 
              className="text-sm px-3 py-1 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300"
            >
              30D
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="1year" 
              aria-label="1 Year view" 
              className="text-sm px-3 py-1 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300"
            >
              1Y
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      {/* Render chart component with selected options and hidden legend */}
      <ConsentActivityChart
        companyId={selectedCompanyId}
        timeframe={timeframe}
        showDropdown={false}
        showLegend={false}
        className="border-none shadow-none"
      />
    </div>
  );
}