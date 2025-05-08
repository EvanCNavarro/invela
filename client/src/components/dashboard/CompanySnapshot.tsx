import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Award,
  CheckCircle,
  Network,
  TrendingUp,
  Building
} from "lucide-react";
import { Widget } from "@/components/dashboard/Widget";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

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
        <Card className="p-4 border rounded-lg shadow-sm">
          <div className="flex items-center">
            <Building className={iconClassName} />
            {companyData?.logoId ? (
              <img
                src={`/api/companies/${companyData.id}/logo`}
                alt={`${companyName} logo`}
                className="w-5 h-5 object-contain mr-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mr-2">
                <span className="text-xs font-medium text-white">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xl font-semibold">{companyName}</span>
          </div>
        </Card>
        
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
            <Link href="/network">
              <a className={valueClassName + " text-blue-500 hover:underline cursor-pointer"}>
                {isLoadingRelationships ? (
                  <Skeleton className="h-10 w-14 mx-auto" />
                ) : (
                  relationshipsCount
                )}
              </a>
            </Link>
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
            <div className="text-xl font-semibold text-green-500">
              {displayStatus}
            </div>
          </Card>
        </div>
      </div>
    </Widget>
  );
}