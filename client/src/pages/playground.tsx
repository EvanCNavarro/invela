import { useState } from "react";
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
  const [selectedComponent, setSelectedComponent] = useState("company-crawler");

  const renderComponent = () => {
    switch (selectedComponent) {
      case "company-crawler":
        return <CompanySearchPlayground />;
      case "headless-crawler":
        return <HeadlessCrawlerPlayground />;
      default:
        return <div>Select a component to preview</div>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Component Selector */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Component</label>
        <Select 
          value={selectedComponent} 
          onValueChange={setSelectedComponent}
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

      {/* Preview Section */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview</h3>
          </div>

          {/* Preview Content */}
          <div className="space-y-6">
            {renderComponent()}
          </div>
        </div>
      </Card>
    </div>
  );
}