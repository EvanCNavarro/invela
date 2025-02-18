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

export const HeadlessCompanyCrawler = () => {
  const [companyName, setCompanyName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    setIsSearching(true);
    try {
      const result = await headlessCompanySearch(companyName.trim());
      setSearchResult(result);
    } catch (error) {
      console.error("Headless search failed:", error);
      setSearchResult({ error: "Search failed" });
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
            <TooltipContent side="right" className="max-w-[300px]">
              <pre className="text-xs whitespace-pre-wrap">
                {searchResult ? JSON.stringify(searchResult, null, 2) : 'No data'}
              </pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default HeadlessCompanyCrawler;
