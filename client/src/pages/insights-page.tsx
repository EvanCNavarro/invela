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
import { AccreditationDotMatrix } from "@/components/insights/AccreditationDotMatrix";
import { RiskRadarChart } from "@/components/insights/RiskRadarChart";

// Default visualization types
const defaultVisualizationTypes = [
  { value: "network_visualization", label: "Network Visualization" },
  { value: "accreditation_status", label: "Accreditation Status" },
  { value: "risk_radar", label: "Risk Radar Chart" },
];

// FinTech-specific visualization types (only Risk Radar)
const fintechVisualizationTypes = [
  { value: "risk_radar", label: "Risk Radar Chart" },
];

export default function InsightsPage() {
  const [selectedVisualization, setSelectedVisualization] = useState("risk_radar");
  const [visualizationTypes, setVisualizationTypes] = useState(defaultVisualizationTypes);
  const [isFintech, setIsFintech] = useState(false);
  
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

  // No longer need company type distribution API

  // Determine if the current company is a FinTech
  useEffect(() => {
    if (currentCompany?.category === "FinTech") {
      setIsFintech(true);
      setVisualizationTypes(fintechVisualizationTypes);
      setSelectedVisualization("risk_radar");
    } else {
      setIsFintech(false);
      setVisualizationTypes(defaultVisualizationTypes);
    }
  }, [currentCompany]);

  const exportData = () => {
    // Implementation for PDF export would go here
    console.log("Exporting visualization...");
  };

  return (
    <DashboardLayout>
      {/* Add tutorial manager for insights page */}
      <TutorialManager tabName="insights" />
      
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
          {selectedVisualization === "network_visualization" && !isFintech && (
            <NetworkInsightVisualization />
          )}

          {/* Company Type Distribution visualization has been removed */}

          {selectedVisualization === "accreditation_status" && !isFintech && (
            <AccreditationDotMatrix />
          )}
          
          {(selectedVisualization === "risk_radar" || isFintech) && (
            <RiskRadarChart className="bg-transparent shadow-none border-none" />
          )}
        </Widget>
      </div>
    </DashboardLayout>
  );
}