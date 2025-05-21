/**
 * RiskMonitoringWidget Component
 * 
 * A dashboard widget that displays the Risk Monitoring insights
 * in a compact format suitable for the dashboard.
 */

import React from 'react';
import { Widget } from './Widget';
import RiskMonitoringInsight from '../insights/RiskMonitoringInsight';
import { ShieldAlert } from 'lucide-react';
import { useLocation } from 'wouter';

interface RiskMonitoringWidgetProps {
  className?: string;
}

const RiskMonitoringWidget: React.FC<RiskMonitoringWidgetProps> = ({
  className
}) => {
  // Use the useLocation hook for navigation
  const [, navigate] = useLocation();

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
    >
      <div className="p-4">
        <RiskMonitoringInsight isWidget={true} />
      </div>
    </Widget>
  );
};

export default RiskMonitoringWidget;