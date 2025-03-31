import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Widget } from "@/components/dashboard/Widget";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
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

const visualizationTypes = [
  { value: "network_visualization", label: "Network Visualization" },
  { value: "relationship_distribution", label: "Company Type Distribution" },
  { value: "accreditation_status", label: "Accreditation Status" },
];

export default function InsightsPage() {
  const [selectedVisualization, setSelectedVisualization] = useState("network_visualization");

  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["/api/companies"],
  });

  const { data: relationships = [] } = useQuery<any[]>({
    queryKey: ["/api/relationships"],
  });

  // Company type distribution from API
  const { data: companyTypeData = [] } = useQuery<{type: string, count: number}[]>({
    queryKey: ['/api/company-type-distribution'],
  });

  const exportData = () => {
    // Implementation for PDF export would go here
    console.log("Exporting visualization...");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

        <Widget title="" className="h-[600px]">
          {selectedVisualization === "network_visualization" && (
            <NetworkInsightVisualization />
          )}

          {selectedVisualization === "relationship_distribution" && (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={companyTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {selectedVisualization === "accreditation_status" && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                Select a different visualization type to view data
              </p>
            </div>
          )}
        </Widget>
      </div>
    </DashboardLayout>
  );
}