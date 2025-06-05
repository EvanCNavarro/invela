import React from "react";
import { Badge } from "@/components/ui/badge";
import { getCompanyAccreditationStatus, getStatusBadgeStyle, normalizeAccreditationStatus } from "@/lib/company-utils";

interface AccreditationStatusDisplayProps {
  status?: string | null;
  company?: any;
  variant?: "badge" | "pill" | "box" | "text";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Unified AccreditationStatusDisplay component
 * 
 * This component provides a consistent way to display accreditation status
 * across the application with different visual styles.
 * 
 * @param status - Direct status string (optional)
 * @param company - Company object from which to extract status (optional)
 * @param variant - Visual style: badge, pill, box, or text
 * @param size - Size of the display
 * @param className - Additional CSS classes
 */
export function AccreditationStatusDisplay({ 
  status, 
  company, 
  variant = "badge",
  size = "md",
  className = ""
}: AccreditationStatusDisplayProps) {
  // Use provided status or extract it from company object
  const rawStatus = status || (company ? getCompanyAccreditationStatus(company) : undefined);
  const styleInfo = getStatusBadgeStyle(rawStatus);
  const normalizedStatus = normalizeAccreditationStatus(rawStatus);
  
  // Size-specific classes
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];
  
  // Render based on the requested variant
  switch (variant) {
    case "badge":
      return (
        <Badge 
          variant={styleInfo.variant as any} 
          className={`${styleInfo.className} ${sizeClasses} ${className}`}
        >
          {styleInfo.label}
        </Badge>
      );
      
    case "pill":
      return (
        <span 
          className={`px-3 py-1 rounded-full font-medium ${styleInfo.bgColor} ${styleInfo.textColor} ${sizeClasses} ${className}`}
        >
          {styleInfo.label}
        </span>
      );
      
    case "box":
      return (
        <div className={`border rounded-lg flex flex-col h-20 px-6 relative overflow-hidden ${className}`}>
          {/* Accent border with gradient */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${styleInfo.gradientFrom} ${styleInfo.gradientTo}`}></div>
          
          <div className="flex flex-col items-center justify-center h-full py-2">
            <span className="text-xs font-medium text-center text-gray-500 uppercase tracking-wide mb-1">
              ACCREDITATION
            </span>
            <span className={`${size === "lg" ? "text-2xl" : "text-xl"} font-bold text-gray-900`}>
              {styleInfo.label}
            </span>
          </div>
        </div>
      );
      
    case "text":
    default:
      return (
        <span className={`font-medium ${styleInfo.textColor} ${sizeClasses} ${className}`}>
          {styleInfo.label}
        </span>
      );
  }
}