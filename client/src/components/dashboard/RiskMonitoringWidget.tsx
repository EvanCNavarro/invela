/**
 * RiskMonitoringWidget Component
 * 
 * A dashboard widget that displays the Risk Monitoring insights
 * in a compact format suitable for the dashboard.
 */

import React, { useMemo } from 'react';
import { Widget } from './Widget';
import RiskMonitoringInsight from '../insights/RiskMonitoringInsight';
import { ShieldAlert } from 'lucide-react';
import { useLocation } from 'wouter';
import { useUnifiedRiskData } from '@/lib/useUnifiedRiskData';

interface RiskMonitoringWidgetProps {
  className?: string;
}

const RiskMonitoringWidget: React.FC<RiskMonitoringWidgetProps> = ({
  className
}) => {
  // Use the useLocation hook for navigation
  const [, navigate] = useLocation();

  // Get unified risk data to calculate blocked count
  const { data: unifiedRiskData } = useUnifiedRiskData({
    includeNetwork: true,
    includeDemo: true,
    enabled: true
  });

  // Calculate blocked companies count
  const blockedCount = useMemo(() => {
    if (!unifiedRiskData?.companies) return 0;
    return unifiedRiskData.companies.filter(company => company.status === 'Blocked').length;
  }, [unifiedRiskData]);

  // Handle click on "View Details" to navigate to insights page
  const handleViewDetails = () => {
    navigate('/insights');
  };

  return (
    <Widget
      title="Risk Monitoring"
      icon={<ShieldAlert className="h-5 w-5" />}
      className={className}
      actions={[
        {
          label: "View Details",
          onClick: handleViewDetails,
          icon: <ShieldAlert className="h-4 w-4" />
        }
      ]}
      headerChildren={
        <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 border border-red-200">
          <div className="flex-shrink-0">
            <div className="relative inline-flex">
              <div className="absolute inline-flex w-2 h-2 bg-red-400 rounded-full opacity-75 animate-ping"></div>
              <div className="relative inline-flex w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          </div>
          <span className="text-red-800">{blockedCount} Data Recipients are blocked</span>
        </div>
      }
    >
      <div className="p-4">
        <RiskMonitoringInsight isWidget={true} />
      </div>
    </Widget>
  );
};

export default RiskMonitoringWidget;