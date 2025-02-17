import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search } from "lucide-react";
import { CompanyCategory } from "@/types/company";

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

const ManualSearchVariant = () => {
  const [companyName, setCompanyName] = useState("");
  const [companyData, setCompanyData] = useState<CompanyData>(emptyCompanyData);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    setIsLoading(true);
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
      setCompanyData({ ...emptyCompanyData, ...data });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Company Data Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Input
            placeholder="Enter company name..."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
        <CompanyDataDisplay data={companyData} />
      </CardContent>
    </Card>
  );
};

const AssociatedCompanyVariant = ({ companyName }: { companyName: string }) => {
  const [companyData, setCompanyData] = useState<CompanyData>(emptyCompanyData);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const { data } = await response.json();
      setCompanyData({ ...emptyCompanyData, ...data });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Associated Company Data Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={handleSearch} disabled={isLoading} className="w-full">
          <Building2 className="h-4 w-4 mr-2" />
          {isLoading ? "Searching..." : "Fetch Company Data"}
        </Button>
        <CompanyDataDisplay data={companyData} />
      </CardContent>
    </Card>
  );
};

export const CompanySearchPlayground = () => {
  return (
    <div className="space-y-8 p-6">
      <ManualSearchVariant />
      <AssociatedCompanyVariant companyName="Example Corp" />
    </div>
  );
};