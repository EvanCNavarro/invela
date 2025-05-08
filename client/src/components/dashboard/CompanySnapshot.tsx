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

interface CompanySnapshotProps {
  companyData: any;
  onToggle: () => void;
  isVisible: boolean;
}

export function CompanySnapshot({ companyData, onToggle, isVisible }: CompanySnapshotProps) {
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
  const cardClassName = "p-4 border rounded-lg shadow-sm flex flex-col items-center";
  const labelClassName = "text-sm font-medium mb-2 text-foreground";
  const valueClassName = "text-3xl font-bold";
  const iconClassName = "h-5 w-5 mr-2 text-foreground";

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
        <div className="bg-muted/50 rounded-lg py-3 px-4 flex flex-col items-center justify-center">
          {companyData?.logoId ? (
            <img
              src={`/api/companies/${companyData.id}/logo`}
              alt={`${companyName} logo`}
              className="w-8 h-8 object-contain mb-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mb-1">
              <span className="text-sm font-medium text-white">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xl font-semibold text-center">{companyName}</span>
        </div>
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Company Relationships Card */}
          <Card className={cardClassName}>
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
        <div className="grid grid-cols-2 gap-4">
          {/* S&P Business Data Risk Score Card */}
          <Card className={cn(
            cardClassName,
            "border-blue-500 border-2"
          )}>
            <div className="flex items-center justify-center mb-2">
              <Award className={iconClassName} />
              <span className={labelClassName}>
                S&P RISK SCORE
              </span>
            </div>
            <div className={valueClassName}>
              {riskScore}
            </div>
          </Card>
          
          {/* Accreditation Card */}
          <Card className={cn(
            cardClassName,
            "border-green-500 border-2"
          )}>
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className={iconClassName} />
              <span className={labelClassName}>
                ACCREDITATION
              </span>
            </div>
            <div className={valueClassName + " text-green-500"}>
              {displayStatus}
            </div>
          </Card>
        </div>
      </div>
    </Widget>
  );
}