import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  AlertTriangle, 
  BarChart,
  Award,
  CheckCircle,
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
      <div className="space-y-4">
        <div className="text-muted-foreground text-sm">
          Key metrics on activity and trends.
        </div>
        
        {/* Company Banner */}
        <div className="bg-muted/50 rounded-lg py-3 px-4 flex items-center space-x-3">
          {companyData?.logoId ? (
            <img
              src={`/api/companies/${companyData.id}/logo`}
              alt={`${companyName} logo`}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-lg font-semibold">{companyName}</span>
        </div>
        
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Company Relationships Card */}
          <Card className="p-4 relative">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium uppercase text-muted-foreground">
                Company Relationships
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="4" cy="8" r="1.5" />
                  <circle cx="12" cy="8" r="1.5" />
                </svg>
              </button>
            </div>
            <div className="text-3xl font-bold text-center mt-2">
              {isLoadingRelationships ? (
                <Skeleton className="h-10 w-14 mx-auto" />
              ) : (
                relationshipsCount
              )}
            </div>
          </Card>
          
          {/* Risk Score Changes Card */}
          <Card className="p-4 relative">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium uppercase text-muted-foreground">
                Risk Score Changes
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="4" cy="8" r="1.5" />
                  <circle cx="12" cy="8" r="1.5" />
                </svg>
              </button>
            </div>
            <div className="text-3xl font-bold text-center mt-2">
              {riskScoreChanges}
            </div>
          </Card>
        </div>
        
        {/* Bottom Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* S&P Business Data Risk Score Card */}
          <Card className={cn(
            "p-4 relative overflow-hidden border-blue-500 border-2",
            "flex flex-col items-center justify-center py-6"
          )}>
            <Award className="h-8 w-8 mb-2" />
            <div className="text-center">
              <div className="uppercase font-medium text-sm mb-1">
                S&P Business Data
              </div>
              <div className="uppercase font-medium text-sm mb-3">
                Risk Score
              </div>
              <div className="text-5xl font-bold">
                {riskScore}
              </div>
            </div>
          </Card>
          
          {/* Accreditation Card */}
          <Card className={cn(
            "p-4 relative overflow-hidden border-green-500 border-2",
            "flex flex-col items-center justify-center py-6"
          )}>
            <CheckCircle className="h-8 w-8 mb-2" />
            <div className="text-center">
              <div className="uppercase font-medium text-sm mb-4">
                Accreditation
              </div>
              <div className="text-2xl font-bold text-green-500">
                {accreditationStatus === "VALID" ? "VALID" : accreditationStatus}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Widget>
  );
}