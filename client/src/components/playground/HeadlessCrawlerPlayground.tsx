import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Info } from "lucide-react";
import { headlessCompanySearch } from "./HeadlessCompanySearch";

export const HeadlessCrawlerPlayground = () => {
  const [companyName, setCompanyName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    setIsSearching(true);
    try {
      const result = await headlessCompanySearch(companyName.trim());
      setSearchResult(result);

      // Log the search results to console
      console.log("[HeadlessCrawler] 📊 Search Results:", {
        existingData: result.existingData,
        companyData: result.companyData,
        enrichedFields: result.enrichedFields,
        missingFields: result.missingFields
      });

      // Log detailed field analysis
      if (result.enrichedFields.length > 0) {
        console.log("[HeadlessCrawler] ✨ Enriched Fields:", result.enrichedFields);
      }
      if (result.missingFields.length > 0) {
        console.log("[HeadlessCrawler] ❌ Missing Fields:", result.missingFields);
      }
    } catch (error) {
      console.error("[HeadlessCrawler] ❌ Search failed:", error);
      setSearchResult({ error: error.message || "Search failed" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-start">
        <Input
          placeholder="Enter company name..."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button 
          onClick={handleSearch}
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
            <TooltipContent side="right" className="max-w-[300px] p-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Search Results</h4>
                <pre className="text-xs whitespace-pre-wrap bg-secondary p-2 rounded">
                  {searchResult ? JSON.stringify(searchResult, null, 2) : 'No data'}
                </pre>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default HeadlessCrawlerPlayground;