import { useState } from "react";
import { CompanySearchPlayground } from "@/components/playground/CompanySearchPlayground";
import { HeadlessSearchDemo } from "@/components/playground/HeadlessSearchDemo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { headlessCompanySearch } from "@/components/playground/HeadlessCompanySearch";
import { Search, Info } from "lucide-react";

export default function PlaygroundPage() {
  const [companyName, setCompanyName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [activeVariant, setActiveVariant] = useState<'headless' | 'ui'>('headless');

  const handleHeadlessSearch = async () => {
    if (!companyName.trim()) return;

    setIsSearching(true);
    try {
      const result = await headlessCompanySearch(companyName.trim());
      setSearchResult(result);
    } catch (error) {
      console.error("Headless search failed:", error);
    } finally {
      setIsSearching(false);
    }
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
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Headless Variant</h4>
              <div className="flex gap-4 items-start">
                <Input
                  placeholder="Enter company name..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleHeadlessSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleHeadlessSearch}
                  disabled={isSearching || !companyName.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-10"
                        disabled={!searchResult}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <pre className="text-xs whitespace-pre-wrap">
                        {searchResult ? JSON.stringify(searchResult, null, 2) : 'No data'}
                      </pre>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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

      {/* Headless Service Demo */}
      <div>
        <h2 className="text-xl font-bold mb-4">Headless Search Technical Demo</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Technical demonstration of the headless search service with detailed debugging output
        </p>
        <HeadlessSearchDemo />
      </div>
    </div>
  );
}