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
import { headlessCompanySearch } from "@/components/playground/HeadlessCompanySearch";
import { Search, Info } from "lucide-react";

export default function PlaygroundPage() {
  const [companyName, setCompanyName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

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
      {/* Dropdown heading */}
      <div>
        <h2 className="text-xl mb-4">Company Data Crawler</h2>
      </div>

      {/* Preview Section */}
      <div>
        <h3 className="text-base font-medium mb-4">Preview</h3>
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

      {/* Company Data Structure */}
      <div>
        <h2 className="text-xl font-bold mb-4">Company Data Structure</h2>
        <CompanySearchPlayground />
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