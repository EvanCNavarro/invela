import { useState } from "react";
import CompanySearchPlayground from "@/components/playground/CompanySearchPlayground";
import HeadlessCrawlerPlayground from "@/components/playground/HeadlessCrawlerPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RiskMeter } from "@/components/dashboard/RiskMeter";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import SearchBarPlayground from "@/components/playground/SearchBarPlayground";
import NetworkSearchPlayground from "@/components/playground/NetworkSearchPlayground";
import DropdownPlayground from "@/components/playground/DropdownPlayground";
import DownloadButtonPlayground from "@/components/playground/DownloadButtonPlayground";
import FileUploadPlayground from '@/components/playground/FileUploadPlayground';
import TabsDemo from "@/components/playground/TabsDemo";
import InvitePlayground from "@/components/playground/InvitePlayground";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

// Define component interface for consistent handling
interface PlaygroundComponent {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  description?: string;
}

// Define all available components
const components: PlaygroundComponent[] = [
  {
    id: "loading-spinner",
    name: "Loading Spinner",
    component: () => (
      <div className="flex items-center gap-8">
        <LoadingSpinner size="sm" />
        <LoadingSpinner size="md" />
        <LoadingSpinner size="lg" />
      </div>
    ),
    description: "Loading spinner component in different sizes"
  },
  {
    id: "data-table",
    name: "Data Table",
    component: DataTable,
    description: "Interactive data table with sorting and filtering"
  },
  {
    id: "search-bar",
    name: "Search Bar",
    component: SearchBarPlayground,
    description: "Search bar with autocomplete"
  },
  {
    id: "network-search",
    name: "Network Search",
    component: NetworkSearchPlayground,
    description: "Network visualization search component"
  },
  {
    id: "unified-dropdown",
    name: "Unified Dropdown",
    component: DropdownPlayground,
    description: "Unified dropdown menu component"
  },
  {
    id: "download-button",
    name: "Download Button",
    component: DownloadButtonPlayground,
    description: "File download button component"
  },
  {
    id: "file-upload",
    name: "File Upload",
    component: FileUploadPlayground,
    description: "File upload component with drag and drop"
  },
  {
    id: "navigational-tab-pane",
    name: "Navigational Tab Pane",
    component: TabsDemo,
    description: "Navigation tabs with content"
  },
  {
    id: "invite-button",
    name: "Invite Button/Modal",
    component: InvitePlayground,
    description: "User invitation component"
  },
  {
    id: "company-data-crawler",
    name: "Company Data Crawler",
    component: CompanySearchPlayground,
    description: "Company data search and crawling tool"
  },
  {
    id: "headless-company-crawler",
    name: "Headless Company Crawler",
    component: HeadlessCrawlerPlayground,
    description: "Headless company data crawler"
  }
];

export default function PlaygroundPage() {
  const [selectedComponent, setSelectedComponent] = useState(components[0].id);

  const currentComponent = components.find(c => c.id === selectedComponent);

  const renderComponent = () => {
    if (!currentComponent) return <div>Select a component to preview</div>;
    const Component = currentComponent.component;
    return <Component />;
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="Component Playground"
        description="Test and preview UI components in different states"
      />

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Component</label>
        <Select 
          value={selectedComponent} 
          onValueChange={setSelectedComponent}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select component">
              {currentComponent?.name || "Select a component"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {components.map(component => (
              <SelectItem 
                key={component.id} 
                value={component.id}
              >
                {component.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview</h3>
            {currentComponent?.description && (
              <p className="text-sm text-muted-foreground">
                {currentComponent.description}
              </p>
            )}
          </div>
          <div className="space-y-6">
            {renderComponent()}
          </div>
        </div>
      </Card>
    </div>
  );
}