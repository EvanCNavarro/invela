import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ConsentActivityChart, TimeframeOption } from './ConsentActivityChart';
import { Loader2 } from 'lucide-react';

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
  const filteredCompanies = React.useMemo(() => {
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
  
  // Loading state
  if (isCurrentCompanyLoading || (showCompanyDropdown && isCompaniesLoading)) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Company dropdown - only shown for Banks and Invela users */}
        {showCompanyDropdown && (
          <Select
            value={selectedCompanyId?.toString()}
            onValueChange={handleCompanyChange}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {filteredCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Timeframe toggle group */}
        <ToggleGroup
          type="single"
          value={timeframe}
          onValueChange={handleTimeframeChange}
          className="justify-start border rounded-md p-1 bg-muted/30"
        >
          <ToggleGroupItem value="1day" aria-label="1 Day view" className="text-sm px-3 py-1">
            1D
          </ToggleGroupItem>
          <ToggleGroupItem value="30days" aria-label="30 Days view" className="text-sm px-3 py-1">
            30D
          </ToggleGroupItem>
          <ToggleGroupItem value="1year" aria-label="1 Year view" className="text-sm px-3 py-1">
            1Y
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      {/* Render chart component with selected options */}
      <ConsentActivityChart
        companyId={selectedCompanyId}
        timeframe={timeframe}
        showDropdown={false}
        className="border-none shadow-none"
      />
    </div>
  );
}