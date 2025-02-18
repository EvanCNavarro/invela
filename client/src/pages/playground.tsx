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
  const [selectedComponent, setSelectedComponent] = useState("loading-spinner");

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
      case "loading-spinner":
        return <div>Loading Spinner Component</div>;
      case "data-table":
        return <div>Data Table Component</div>;
      case "sidebar-menu":
        return <div>Sidebar Menu Component</div>;
      case "sidebar-tab":
        return <div>Sidebar Tab Component</div>;
      case "search-bar":
        return <div>Search Bar Component</div>;
      case "network-search":
        return <div>Network Search Component</div>;
      case "unified-dropdown":
        return <div>Unified Dropdown Component</div>;
      case "download-button":
        return <div>Download Button Component</div>;
      case "file-upload":
        return <div>File Upload Component</div>;
      case "navigational-tab-pane":
        return <div>Navigational Tab Pane Component</div>;
      case "invite-button":
        return <div>Invite Button/Modal Component</div>;
      case "company-data-crawler":
        console.log("[PlaygroundPage] Rendering Company Data Crawler");
        return <CompanySearchPlayground />;
      case "headless-company-crawler":
        console.log("[PlaygroundPage] Rendering Headless Company Crawler");
        return <HeadlessCrawlerPlayground />;
      default:
        console.log("[PlaygroundPage] No matching component");
        return <div>Select a component to preview</div>;
    }
  };

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
            <SelectItem value="loading-spinner">Loading Spinner</SelectItem>
            <SelectItem value="data-table">Data Table</SelectItem>
            <SelectItem value="sidebar-menu">Sidebar Menu</SelectItem>
            <SelectItem value="sidebar-tab">Sidebar Tab</SelectItem>
            <SelectItem value="search-bar">Search Bar</SelectItem>
            <SelectItem value="network-search">Network Search</SelectItem>
            <SelectItem value="unified-dropdown">Unified Dropdown</SelectItem>
            <SelectItem value="download-button">Download Button</SelectItem>
            <SelectItem value="file-upload">File Upload</SelectItem>
            <SelectItem value="navigational-tab-pane">Navigational Tab Pane</SelectItem>
            <SelectItem value="invite-button">Invite Button/Modal</SelectItem>
            <SelectItem value="company-data-crawler">Company Data Crawler</SelectItem>
            <SelectItem value="headless-company-crawler">Headless Company Crawler</SelectItem>
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
