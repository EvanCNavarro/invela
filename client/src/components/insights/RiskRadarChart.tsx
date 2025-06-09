import React from 'react';
import { RiskRadarD3Simple } from '@/components/insights/RiskRadarD3Simple';

interface RiskRadarChartProps {
  className?: string;
  companyId?: number;
  showDropdown?: boolean;
  width?: number;
  height?: number;
}

export function RiskRadarChart({ className, companyId, showDropdown = true }: RiskRadarChartProps) {
  return (
    <RiskRadarD3Simple
      className={className}
      companyId={companyId}
      showDropdown={showDropdown}
    />
  );
}