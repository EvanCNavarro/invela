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

const CompanyDataDisplay = ({ data }: { data: CompanyData }) => (
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

const SearchResultSection = ({ 
  title, 
  data, 
  isLoading 
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

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    setIsLoading(true);
    setSearchResults({
      googleOnly: emptyCompanyData,
      hybrid: emptyCompanyData,
      openaiOnly: emptyCompanyData,
    });

    try {
      const response = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const { data } = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <Input
          placeholder="Enter company name..."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <LoadingSpinner size="sm" className="mr-2" />
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