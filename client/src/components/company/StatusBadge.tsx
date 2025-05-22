import React from "react";
import { Badge } from "@/components/ui/badge";
import { getCompanyAccreditationStatus, getStatusBadgeStyle } from "@/lib/company-utils";

interface StatusBadgeProps {
  status?: string;
  company?: any;
}

export function StatusBadge({ status, company }: StatusBadgeProps) {
  // Use provided status or extract it from company object
  const displayStatus = status || (company ? getCompanyAccreditationStatus(company) : undefined);
  const badgeStyle = getStatusBadgeStyle(displayStatus);
  
  return (
    <Badge 
      variant={badgeStyle.variant as any} 
      className={badgeStyle.className}
    >
      {badgeStyle.label}
    </Badge>
  );
}