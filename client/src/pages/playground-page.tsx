import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { TutorialManager } from "@/components/tutorial/TutorialManager";
import CompanySearchPlayground from "@/components/playground/CompanySearchPlayground";
import HeadlessCrawlerPlayground from "@/components/playground/HeadlessCrawlerPlayground";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import FormFieldPlayground from "@/pages/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import SearchBarPlayground from "@/components/playground/SearchBarPlayground";
import NetworkSearchPlayground from "@/components/playground/NetworkSearchPlayground";
import DropdownPlayground from "@/components/playground/DropdownPlayground";
import DownloadButtonPlayground from "@/components/playground/DownloadButtonPlayground";
import FileUploadPlayground from '@/components/playground/FileUploadPlayground';
import TabsDemo from "@/components/playground/TabsDemo";
import InvitePlayground from "@/components/playground/InvitePlayground";
import WebSocketPlayground from "@/components/playground/WebSocketPlayground";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import PageSideDrawerPlayground from "@/components/playground/PageSideDrawerPlayground";
import FormPlayground from "@/components/playground/FormPlayground";
import { UniversalForm } from "@/components/forms";

// Sample data for DataTable demo
const sampleTableData = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Editor" },
];

const sampleTableColumns = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "role", header: "Role", sortable: true },
];

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
    id: "company-data-crawler",
    name: "Company Data Crawler",
    component: CompanySearchPlayground,
    description: "Company data search and crawling tool"
  },
  {
    id: "data-table",
    name: "Data Table",
    component: () => (
      <DataTable
        data={sampleTableData}
        columns={sampleTableColumns}
      />
    ),
    description: "Interactive data table with sorting and filtering"
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
    id: "form",
    name: "Form",
    component: FormPlayground,
    description: "Multi-step form with wizard navigation and progress tracking"
  },
  {
    id: "form-field",
    name: "Form Field",
    component: FormFieldPlayground,
    description: "Interactive form field component with various states and types"
  },
  {
    id: "headless-company-crawler",
    name: "Headless Company Crawler",
    component: HeadlessCrawlerPlayground,
    description: "Headless company data crawler"
  },
  {
    id: "invite-button",
    name: "Invite Button/Modal",
    component: InvitePlayground,
    description: "User invitation component"
  },
  {
    id: "kyb-form",
    name: "KYB Form",
    component: () => <UniversalForm taskType="kyb" onSubmit={(data) => console.log('Form submitted:', data)} />,
    description: "Interactive KYB form with company data suggestions"
  },
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
    id: "navigational-tab-pane",
    name: "Navigational Tab Pane",
    component: TabsDemo,
    description: "Navigation tabs with content"
  },
  {
    id: "network-search",
    name: "Network Search",
    component: NetworkSearchPlayground,
    description: "Network visualization search component"
  },
  {
    id: "page-side-drawer",
    name: "Page Side Drawer",
    component: PageSideDrawerPlayground,
    description: "Page-embedded side drawer with customizable features"
  },
  {
    id: "search-bar",
    name: "Search Bar",
    component: SearchBarPlayground,
    description: "Search bar with autocomplete"
  },
  {
    id: "sidebar-menu",
    name: "Sidebar Menu",
    component: () => <div>Sidebar Menu Playground</div>,
    description: "Sidebar navigation menu component"
  },
  {
    id: "sidebar-tab",
    name: "Sidebar Tab",
    component: () => <div>Sidebar Tab Playground</div>,
    description: "Individual sidebar tab component"
  },
  {
    id: "unified-dropdown",
    name: "Unified Dropdown",
    component: DropdownPlayground,
    description: "Unified dropdown menu component"
  },
  {
    id: "websocket",
    name: "WebSocket Demo",
    component: WebSocketPlayground,
    description: "Real-time WebSocket communication demo"
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="Component Playground"
            description="Test and preview UI components in different states"
          />
        </div>

        <div className="space-y-6">
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
                {components.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(component => (
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview</h3>
                {currentComponent?.description && (
                  <p className="text-sm text-muted-foreground">
                    {currentComponent.description}
                  </p>
                )}
              </div>
              <div>
                {renderComponent()}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}