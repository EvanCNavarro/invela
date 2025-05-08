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

  return (
    <Widget
      title="Company Snapshot"
      icon={<Building2 className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-2"
    >
      <div className="space-y-3">
        <div className="text-muted-foreground text-sm mb-1">
          Key metrics on activity and trends.
        </div>
        
        {/* Company Banner */}
        <div className="bg-muted/50 rounded-lg py-3 px-4 flex items-center space-x-3">
          {companyData?.logoId ? (
            <img
              src={`/api/companies/${companyData.id}/logo`}
              alt={`${companyName} logo`}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xl font-semibold">{companyName}</span>
        </div>
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Company Relationships Card */}
          <Card className="p-3 border rounded-lg shadow-sm">
            <div className="text-xs font-medium uppercase text-muted-foreground mb-1 text-center">
              COMPANY RELATIONSHIPS
            </div>
            <div className="flex justify-center">
              <Network className="w-5 h-5 text-muted-foreground mb-1" />
            </div>
            <div className="text-4xl font-bold text-center">
              {isLoadingRelationships ? (
                <Skeleton className="h-10 w-14 mx-auto" />
              ) : (
                relationshipsCount
              )}
            </div>
          </Card>
          
          {/* Risk Score Changes Card */}
          <Card className="p-3 border rounded-lg shadow-sm">
            <div className="text-xs font-medium uppercase text-muted-foreground mb-1 text-center">
              RISK SCORE CHANGES
            </div>
            <div className="flex justify-center">
              <TrendingUp className="w-5 h-5 text-muted-foreground mb-1" />
            </div>
            <div className="text-4xl font-bold text-center">
              {riskScoreChanges}
            </div>
          </Card>
        </div>
        
        {/* Bottom Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* S&P Business Data Risk Score Card */}
          <Card className={cn(
            "p-3 border border-blue-500 border-2 rounded-lg shadow-sm",
            "flex flex-col items-center"
          )}>
            <Award className="h-6 w-6 text-blue-600 my-1" />
            <div className="text-center">
              <div className="uppercase font-medium text-xs">
                S&P BUSINESS DATA
              </div>
              <div className="uppercase font-medium text-xs mb-1">
                RISK SCORE
              </div>
              <div className="text-5xl font-bold">
                {riskScore}
              </div>
            </div>
          </Card>
          
          {/* Accreditation Card */}
          <Card className={cn(
            "p-3 border border-green-500 border-2 rounded-lg shadow-sm",
            "flex flex-col items-center"
          )}>
            <CheckCircle className="h-6 w-6 text-green-600 my-1" />
            <div className="text-center">
              <div className="uppercase font-medium text-xs mb-2">
                ACCREDITATION
              </div>
              <div className="text-2xl font-bold text-green-500">
                {displayStatus}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Widget>
  );
}