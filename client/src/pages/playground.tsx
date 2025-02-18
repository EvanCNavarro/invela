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

export default function PlaygroundPage() {
  const [activeVariant, setActiveVariant] = useState<'headless' | 'ui'>('headless');
  const [showHeadlessSearch, setShowHeadlessSearch] = useState(false);

  const handleHeadlessExecute = () => {
    setShowHeadlessSearch(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-12">
      {/* Component Selector */}
      <div>
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium">Preview</h3>
          <div className="flex gap-2">
            <Button
              variant={activeVariant === 'headless' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveVariant('headless')}
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
            /* Headless Variant */
            <div>
              <div className="flex items-center justify-between mb-4">
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
            /* UI Variant */
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">UI Variant</h4>
              <CompanySearchPlayground />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}