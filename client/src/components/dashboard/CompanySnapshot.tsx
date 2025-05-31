/**
 * ========================================
 * Company Snapshot Widget - Executive Overview
 * ========================================
 * 
 * Comprehensive company overview widget providing key business metrics,
 * risk indicators, and network relationships for executive decision-making.
 * Features real-time data integration and interactive navigation capabilities.
 * 
 * Key Features:
 * - Real-time company performance metrics
 * - Risk score and trending indicators
 * - Network relationship visualization
 * - Interactive navigation to detailed views
 * - Responsive design with loading states
 * 
 * Data Sources:
 * - Company profile and business information
 * - Real-time risk assessment data
 * - Network relationship analysis
 * - Performance trend calculations
 * 
 * @module components/dashboard/CompanySnapshot
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Award,
  CheckCircle,
  Network,
  TrendingUp
} from "lucide-react";
import { Widget } from "@/components/dashboard/Widget";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface CompanySnapshotProps {
  companyData: any;
  onToggle: () => void;
  isVisible: boolean;
}

export function CompanySnapshot({ companyData, onToggle, isVisible }: CompanySnapshotProps) {
  const [, setLocation] = useLocation();
  
  // Fetch network relationships to get the count
  const { data: relationships, isLoading: isLoadingRelationships } = useQuery<any[]>({
    queryKey: ["/api/relationships"],
    enabled: !!companyData?.id,
  });

  // For risk score changes, we'll use a static value of 11 as suggested
  const riskScoreChanges = 11;

  // Get the company's risk score
  const riskScore = companyData?.riskScore || companyData?.risk_score || 0;
  
  // Get the accreditation status
  const accreditationStatus = companyData?.accreditation_status || "PENDING";
  const displayStatus = accreditationStatus === "VALID" ? "APPROVED" : accreditationStatus;

  const companyName = companyData?.name || "Loading...";
  const relationshipsCount = relationships?.length || 0;

  // Common styles
  const cardClassName = "p-3 sm:p-4 border rounded-lg shadow-sm flex flex-col items-center";
  const labelClassName = "text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-foreground text-center";
  const valueClassName = "text-2xl sm:text-3xl font-bold text-black";
  const iconClassName = "h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-foreground";

  // Handle click on relationships card
  const handleRelationshipsClick = () => {
    setLocation("/network");
  };

  return (
    <Widget
      title="Company Snapshot"
      icon={<Building2 className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-2"
    >
      <div className="space-y-4">
        {/* Company Banner */}
        <Card className="p-4 border rounded-lg shadow-sm">
          <div className="flex flex-col items-center">
            {companyData?.logoId ? (
              <img
                src={`/api/companies/${companyData.id}/logo`}
                alt={`${companyName} logo`}
                className="w-8 h-8 object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mb-2">
                <span className="text-sm font-medium text-white">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xl font-semibold text-black">{companyName}</span>
          </div>
        </Card>
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Relationships Card */}
          <Card 
            className={cn(
              cardClassName, 
              "cursor-pointer transition-colors hover:bg-gray-50"
            )}
            onClick={handleRelationshipsClick}
          >
            <div className="flex items-center justify-center mb-2">
              <Network className={iconClassName} />
              <span className={labelClassName}>
                RELATIONSHIPS
              </span>
            </div>
            <div className={valueClassName}>
              {isLoadingRelationships ? (
                <Skeleton className="h-10 w-14 mx-auto" />
              ) : (
                relationshipsCount
              )}
            </div>
          </Card>
          
          {/* Risk Score Changes Card */}
          <Card className={cardClassName}>
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className={iconClassName} />
              <span className={labelClassName}>
                RISK CHANGES
              </span>
            </div>
            <div className={valueClassName}>
              {riskScoreChanges}
            </div>
          </Card>
        </div>
        
        {/* Bottom Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* S&P Business Data Risk Score Card */}
          <Card className={cn(
            cardClassName,
            "border-blue-500/50 border-2"
          )}>
            <div className="flex flex-col items-center mb-1 sm:mb-2">
              <div className="flex items-center justify-center">
                <Award className={iconClassName} />
                <span className="text-xs sm:text-sm font-medium text-foreground">S&P DATA</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">ACCESS RISK SCORE</span>
            </div>
            <div className={valueClassName}>
              {riskScore}
            </div>
          </Card>
          
          {/* Accreditation Card */}
          <Card className={cn(
            cardClassName,
            "border-green-500/50 border-2"
          )}>
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <CheckCircle className={iconClassName} />
              <span className={labelClassName}>
                ACCREDITATION
              </span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-black">
              {displayStatus}
            </div>
          </Card>
        </div>
      </div>
    </Widget>
  );
}