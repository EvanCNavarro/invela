import { Widget } from "@/components/dashboard/Widget";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { AlertTriangle } from "lucide-react";

interface CompanyScoreWidgetProps {
  companyData: any;
  onToggle: () => void;
  isVisible: boolean;
}

export function CompanyScoreWidget({ companyData, onToggle, isVisible }: CompanyScoreWidgetProps) {
  return (
    <Widget
      title="Company Score"
      icon={<AlertTriangle className="h-5 w-5" />}
      onVisibilityToggle={onToggle}
      isVisible={isVisible}
      headerClassName="pb-2" /* Reduce padding below header */
      className="h-full w-full flex flex-col"
    >
      <div className="space-y-2 py-1 w-full h-full px-4">
        <div className="bg-muted/50 rounded-lg py-1 px-3 flex items-center justify-center space-x-2">
          {companyData?.logoId ? (
            <img
              src={`/api/companies/${companyData.id}/logo`}
              alt={`${companyData.name} logo`}
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                console.debug(`Failed to load logo for company: ${companyData.name}`);
              }}
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {companyData?.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm font-medium">{companyData?.name}</span>
        </div>
        <RiskMeter 
          score={companyData?.riskScore || companyData?.risk_score || 0}
          chosenScore={companyData?.chosenScore || companyData?.chosen_score || undefined}
          companyId={companyData?.id || 0}
          companyType={companyData?.category || "FinTech"}
          canAdjust={companyData?.category ? ['Bank', 'Invela'].includes(companyData.category) : false}
        />
      </div>
    </Widget>
  )
}