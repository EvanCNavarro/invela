import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search } from "lucide-react";
import { CompanyCategory } from "@/types/company";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface CompanyData {
  name: string;
  stockTicker?: string;
  websiteUrl?: string;
  legalStructure?: string;
  hqAddress?: string;
  productsServices?: string;
  incorporationYear?: number;
  numEmployees?: number;
  category?: CompanyCategory;
  description?: string;
  error?: string;
}

const emptyCompanyData: CompanyData = {
  name: "",
  stockTicker: undefined,
  websiteUrl: undefined,
  legalStructure: undefined,
  hqAddress: undefined,
  productsServices: undefined,
  incorporationYear: undefined,
  numEmployees: undefined,
  category: undefined,
  description: undefined,
  error: undefined,
};

interface DataFieldProps {
  label: string;
  value: string | number | undefined;
}

const DataField = ({ label, value }: DataFieldProps) => (
  <div className="flex flex-col space-y-1">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm">{value || "Not found"}</span>
  </div>
);

const CompanyDataDisplay = ({ data }: { data: CompanyData }) => {
  if (data.error) {
    return (
      <div className="p-4 text-center text-red-500">
        {data.error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <DataField label="Name" value={data.name} />
      <DataField label="Stock Ticker" value={data.stockTicker} />
      <DataField label="Website" value={data.websiteUrl} />
      <DataField label="Legal Structure" value={data.legalStructure} />
      <DataField label="HQ Address" value={data.hqAddress} />
      <DataField label="Products/Services" value={data.productsServices} />
      <DataField label="Incorporation Year" value={data.incorporationYear} />
      <DataField label="Number of Employees" value={data.numEmployees} />
      <DataField label="Category" value={data.category} />
      <DataField label="Description" value={data.description} />
    </div>
  );
};

const SearchResultSection = ({
  title,
  data,
  isLoading,
}: {
  title: string;
  data: CompanyData;
  isLoading: boolean;
}) => (
  <Card className="flex-1">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <CompanyDataDisplay data={data} />
      )}
    </CardContent>
  </Card>
);

export const CompanySearchPlayground = () => {
  const [companyName, setCompanyName] = useState("");
  const [searchResults, setSearchResults] = useState({
    googleOnly: emptyCompanyData,
    hybrid: emptyCompanyData,
    openaiOnly: emptyCompanyData,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    setIsLoading(true);
    setSearchStartTime(Date.now());
    setSearchResults({
      googleOnly: emptyCompanyData,
      hybrid: emptyCompanyData,
      openaiOnly: emptyCompanyData,
    });

    try {
      console.log(`[Search] Starting search for: ${companyName}`);
      const startTime = Date.now();

      const response = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const { data } = await response.json();
      const endTime = Date.now();
      console.log(`[Search] Completed in ${endTime - startTime}ms. Results:`, data);
      setSearchResults(data);
    } catch (error) {
      console.error("[Search] Error:", error);
      setSearchResults({
        googleOnly: { name: companyName, error: "Search failed" },
        hybrid: { name: companyName, error: "Search failed" },
        openaiOnly: { name: companyName, error: "Search failed" },
      });
    } finally {
      setIsLoading(false);
      setSearchStartTime(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <Input
          placeholder="Enter company name..."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {searchStartTime && (
                <span className="text-xs">
                  {Math.floor((Date.now() - searchStartTime) / 1000)}s
                </span>
              )}
            </>
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SearchResultSection
          title="Google Search Only"
          data={searchResults.googleOnly}
          isLoading={isLoading}
        />
        <SearchResultSection
          title="Hybrid Search"
          data={searchResults.hybrid}
          isLoading={isLoading}
        />
        <SearchResultSection
          title="OpenAI Search Only"
          data={searchResults.openaiOnly}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};