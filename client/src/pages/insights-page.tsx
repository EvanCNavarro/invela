import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import {
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { NetworkInsightVisualization } from "@/components/insights/NetworkInsightVisualization";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";
import { ConsentActivityInsight } from "@/components/insights/ConsentActivityInsight";
import { SystemOverviewInsight } from "@/components/insights/SystemOverviewInsight";
import RiskMonitoringInsight from "@/components/insights/RiskMonitoringInsight";
import SimpleTreemap from "@/components/insights/SimpleTreemap";

// Default visualization types
const defaultVisualizationTypes = [
  { value: "network_treemap", label: "Network Treemap" },
  { value: "risk_monitoring", label: "Risk Monitoring" },
  { value: "network_visualization", label: "Network Visualization" },
  { value: "risk_radar", label: "Risk Radar Chart" },
  { value: "consent_activity", label: "Consent Activity" },
];

// FinTech-specific visualization types
const fintechVisualizationTypes = [
  { value: "risk_radar", label: "Risk Radar Chart" },
  { value: "consent_activity", label: "Consent Activity" },
];

// Invela admin-specific visualization types - COMPLETE ACCESS TO ALL INSIGHTS
const invelaVisualizationTypes = [
  { value: "network_treemap", label: "Network Treemap" },
  { value: "system_overview", label: "System Overview" },
  { value: "risk_monitoring", label: "Risk Monitoring" },
  { value: "risk_radar", label: "Risk Radar Chart" },
  { value: "network_visualization", label: "Network Visualization" },
  { value: "consent_activity", label: "Consent Activity" },
];

export default function InsightsPage() {
  const [selectedVisualization, setSelectedVisualization] = useState("network_treemap");
  const [visualizationTypes, setVisualizationTypes] = useState(defaultVisualizationTypes);
  const [isFintech, setIsFintech] = useState(false);
  const [isInvela, setIsInvela] = useState(false);
  
  // Get current company data
  const { data: currentCompany } = useQuery<any>({
    queryKey: ["/api/companies/current"],
  });

  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["/api/companies"],
  });

  const { data: relationships = [] } = useQuery<any[]>({
    queryKey: ["/api/relationships"],
  });

  // Determine company type and set appropriate visualizations
  useEffect(() => {
    if (currentCompany?.category === "FinTech") {
      setIsFintech(true);
      setIsInvela(false);
      setVisualizationTypes(fintechVisualizationTypes);
      setSelectedVisualization("risk_radar");
    } else if (currentCompany?.category === "Invela") {
      setIsFintech(false);
      setIsInvela(true);
      setVisualizationTypes(invelaVisualizationTypes);
      setSelectedVisualization("risk_radar");
    } else {
      setIsFintech(false);
      setIsInvela(false);
      setVisualizationTypes(defaultVisualizationTypes);
      setSelectedVisualization("risk_radar");
    }
  }, [currentCompany]);

  const exportData = () => {
    // Implementation for PDF export would go here
    console.log("Exporting visualization...");
  };

  return (
    <DashboardLayout>
      {/* Add tutorial manager for insights page */}
      <TutorialManager tabName="insights">
        <></>
      </TutorialManager>
      
      <div className="space-y-6 flex flex-col overflow-y-auto pb-8">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Insights"
            description="Analyze and visualize your company's data and relationships."
          />
          <Button variant="outline" onClick={exportData} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
        
        {!isFintech && (
          <div className="flex justify-between items-center">
            <Select
              value={selectedVisualization}
              onValueChange={setSelectedVisualization}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select visualization" />
              </SelectTrigger>
              <SelectContent>
                {visualizationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Widget title="" className="h-[600px] mb-12">
          {selectedVisualization === "system_overview" && isInvela && (
            <SystemOverviewInsight className="bg-transparent shadow-none border-none" />
          )}
          
          {selectedVisualization === "risk_monitoring" && !isFintech && (
            <RiskMonitoringInsight className="bg-transparent shadow-none border-none" />
          )}
          
          {selectedVisualization === "network_visualization" && !isFintech && (
            <NetworkInsightVisualization />
          )}

          {selectedVisualization === "network_treemap" && !isFintech && (
            <SimpleTreemap />
          )}

          {selectedVisualization === "risk_radar" && (
            <div className="w-full h-full">
              {/* Explicitly set showDropdown to true with improved spacing */}
              <RiskRadarChart 
                showDropdown={true} 
                className="bg-white rounded-md shadow-sm border" 
              />
            </div>
          )}
          
          {selectedVisualization === "consent_activity" && (
            <ConsentActivityInsight className="bg-transparent shadow-none border-none" />
          )}
        </Widget>
      </div>
    </DashboardLayout>
  );
}