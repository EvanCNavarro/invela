import { useState } from "react";
import { Button } from "@/components/ui/button";
import { headlessCompanySearch, CompanySearchResult } from "./HeadlessCompanySearch";

export function HeadlessSearchDemo() {
  const [searchResult, setSearchResult] = useState<CompanySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoSearch = async () => {
    setIsSearching(true);
    setError(null);
    try {
      const result = await headlessCompanySearch("Microsoft");
      setSearchResult(result);
      console.log("[HeadlessDemo] Search result:", result);
    } catch (err) {
      setError(err.message);
      console.error("[HeadlessDemo] Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleDemoSearch}
        disabled={isSearching}
      >
        {isSearching ? "Searching..." : "Run Headless Search Demo"}
      </Button>

      {error && (
        <div className="text-red-500">
          Error: {error}
        </div>
      )}

      {searchResult && (
        <div className="space-y-2">
          <p>Search completed:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Existing data: {searchResult.existingData ? "Yes" : "No"}</li>
            <li>Enriched fields: {searchResult.enrichedFields.length}</li>
            <li>Missing fields: {searchResult.missingFields.length}</li>
          </ul>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
            {JSON.stringify(searchResult.companyData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default HeadlessSearchDemo;
