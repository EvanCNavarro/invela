import { useState, useEffect } from "react";
import { CompanySearchPlayground } from "@/components/playground/CompanySearchPlayground";
import { HeadlessCrawlerPlayground } from "@/components/playground/HeadlessCrawlerPlayground";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function PlaygroundPage() {
  console.log("[PlaygroundPage] Component mounting");
  const [selectedComponent, setSelectedComponent] = useState("company-crawler");

  useEffect(() => {
    console.log("[PlaygroundPage] Initial mount effect");
    console.log("[PlaygroundPage] Available components:", {
      CompanySearchPlayground: !!CompanySearchPlayground,
      HeadlessCrawlerPlayground: !!HeadlessCrawlerPlayground
    });
  }, []);

  useEffect(() => {
    console.log("[PlaygroundPage] Selected component changed:", selectedComponent);
  }, [selectedComponent]);

  const renderComponent = () => {
    console.log("[PlaygroundPage] Rendering component:", selectedComponent);
    switch (selectedComponent) {
      case "company-crawler":
        console.log("[PlaygroundPage] Rendering CompanySearchPlayground");
        return <CompanySearchPlayground />;
      case "headless-crawler":
        console.log("[PlaygroundPage] Rendering HeadlessCrawlerPlayground");
        return <HeadlessCrawlerPlayground />;
      default:
        console.log("[PlaygroundPage] No matching component");
        return <div>Select a component to preview</div>;
    }
  };

  console.log("[PlaygroundPage] Current state:", {
    selectedComponent,
    isCompanySearchAvailable: !!CompanySearchPlayground,
    isHeadlessCrawlerAvailable: !!HeadlessCrawlerPlayground
  });

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Component</label>
        <Select 
          value={selectedComponent} 
          onValueChange={(value) => {
            console.log("[PlaygroundPage] Selection changed to:", value);
            setSelectedComponent(value);
          }}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select component" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company-crawler">Company Data Crawler</SelectItem>
            <SelectItem value="headless-crawler">Headless Company Crawler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview</h3>
          </div>
          <div className="space-y-6">
            {renderComponent()}
          </div>
        </div>
      </Card>
    </div>
  );
}