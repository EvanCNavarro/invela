import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
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
    } catch (error) {
      console.error("Headless search failed:", error);
      setSearchResult({ error: "Search failed" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
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
      </div>

      {searchResult && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
              {JSON.stringify(searchResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HeadlessCrawlerPlayground;
