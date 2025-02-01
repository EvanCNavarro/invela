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

const visualizationTypes = [
  { value: "risk_trends", label: "Risk Score Trends" },
  { value: "relationship_distribution", label: "Relationship Distribution" },
  { value: "accreditation_status", label: "Accreditation Status" },
];

export default function InsightsPage() {
  const [selectedVisualization, setSelectedVisualization] = useState("risk_trends");

  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ["/api/relationships"],
  });

  // Sample data transformation for visualizations
  const riskTrendsData = companies.map((company: any) => ({
    name: company.name,
    score: company.riskScore || 0,
  })).slice(0, 10);

  const relationshipData = relationships.reduce((acc: any, rel: any) => {
    const type = rel.relationshipType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const relationshipChartData = Object.entries(relationshipData).map(([type, count]) => ({
    type,
    count,
  }));

  const exportData = () => {
    // Implementation for PDF export would go here
    console.log("Exporting visualization...");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <Widget title="Data Visualization" className="h-[600px]">
          {selectedVisualization === "risk_trends" && (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={riskTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {selectedVisualization === "relationship_distribution" && (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={relationshipChartData}>
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
