import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { NetworkFilters, RiskBucket } from "./types";

interface NetworkFiltersProps {
  filters: NetworkFilters;
  onFiltersChange: (filters: NetworkFilters) => void;
}

export function NetworkFiltersComponent({ filters, onFiltersChange }: NetworkFiltersProps) {
  const toggleRiskBucket = (bucket: RiskBucket) => {
    const newBuckets = [...filters.riskBuckets];
    const index = newBuckets.indexOf(bucket);
    
    if (index >= 0) {
      newBuckets.splice(index, 1);
    } else {
      newBuckets.push(bucket);
    }
    
    onFiltersChange({
      ...filters,
      riskBuckets: newBuckets
    });
  };

  const toggleAccreditationStatus = (status: string) => {
    const newStatuses = [...filters.accreditationStatus];
    const index = newStatuses.indexOf(status);
    
    if (index >= 0) {
      newStatuses.splice(index, 1);
    } else {
      newStatuses.push(status);
    }
    
    onFiltersChange({
      ...filters,
      accreditationStatus: newStatuses
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      riskBuckets: [],
      accreditationStatus: []
    });
  };

  const hasActiveFilters = filters.riskBuckets.length > 0 || filters.accreditationStatus.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={hasActiveFilters ? "default" : "outline"} 
          size="sm"
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters ? `Filters (${filters.riskBuckets.length + filters.accreditationStatus.length})` : "Filter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Risk Level</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={filters.riskBuckets.includes('none')}
          onCheckedChange={() => toggleRiskBucket('none')}
        >
          None (0)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.riskBuckets.includes('low')}
          onCheckedChange={() => toggleRiskBucket('low')}
        >
          Low (1-33)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.riskBuckets.includes('medium')}
          onCheckedChange={() => toggleRiskBucket('medium')}
        >
          Medium (34-66)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.riskBuckets.includes('high')}
          onCheckedChange={() => toggleRiskBucket('high')}
        >
          High (67-99)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.riskBuckets.includes('critical')}
          onCheckedChange={() => toggleRiskBucket('critical')}
        >
          Critical (100)
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Accreditation Status</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={filters.accreditationStatus.includes('APPROVED')}
          onCheckedChange={() => toggleAccreditationStatus('APPROVED')}
        >
          Approved
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.accreditationStatus.includes('PENDING')}
          onCheckedChange={() => toggleAccreditationStatus('PENDING')}
        >
          Pending
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.accreditationStatus.includes('IN_REVIEW')}
          onCheckedChange={() => toggleAccreditationStatus('IN_REVIEW')}
        >
          In Review
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.accreditationStatus.includes('PROVISIONALLY_APPROVED')}
          onCheckedChange={() => toggleAccreditationStatus('PROVISIONALLY_APPROVED')}
        >
          Provisionally Approved
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2" 
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}