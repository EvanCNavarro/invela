import { useState } from "react";
import { CompanySearchPlayground } from "@/components/playground/CompanySearchPlayground";
import { HeadlessCompanyCrawler } from "@/components/playground/HeadlessCompanyCrawler";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PlaygroundPage() {
  const [activeVariant, setActiveVariant] = useState<'headless' | 'ui'>('headless');
  const [showHeadlessSearch, setShowHeadlessSearch] = useState(false);

  const handleHeadlessExecute = () => {
    setShowHeadlessSearch(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Component Selector */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Select Component</label>
        <Select defaultValue="company-crawler">
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select component" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company-crawler">Company Data Crawler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview Section */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Preview</h3>
            <div className="flex gap-2">
              <Button
                variant={activeVariant === 'headless' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveVariant('headless');
                  setShowHeadlessSearch(false);
                }}
              >
                Headless
              </Button>
              <Button
                variant={activeVariant === 'ui' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveVariant('ui')}
              >
                UI
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="space-y-6">
            {activeVariant === 'headless' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Headless Variant</h4>
                  <Button
                    size="sm"
                    onClick={handleHeadlessExecute}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Execute Headless Search
                  </Button>
                </div>
                {showHeadlessSearch && <HeadlessCompanyCrawler />}
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">UI Variant</h4>
                <CompanySearchPlayground />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}