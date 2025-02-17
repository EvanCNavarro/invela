import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search } from "lucide-react";
import { CompanyCategory } from "@/types/company";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

// Define the complete company data structure
interface CompanyData {
  // Core Fields
  id?: number;
  name: string;
  category?: CompanyCategory;
  description?: string;
  logoId?: string;

  // Business Information
  stockTicker?: string;
  websiteUrl?: string;
  legalStructure?: string;
  marketPosition?: string;
  hqAddress?: string;
  productsServices?: string;
  incorporationYear?: number;
  foundersAndLeadership?: string;
  numEmployees?: number;
  revenue?: string;

  // Relationships & Status
  keyClientsPartners?: string[];
  investors?: string[];
  fundingStage?: string;
  exitStrategyHistory?: string;

  // Compliance & Security
  certificationsCompliance?: string[];
  riskScore?: number;
  accreditationStatus?: string;

  // File Management
  filesPublic?: string[];
  filesPrivate?: string[];

  // Timestamps
  registryDate?: string;
  createdAt?: string;
  updatedAt?: string;

  // Additional Features
  onboardingCompanyCompleted?: boolean;

  error?: string;
}

// Initial empty state
const emptyCompanyData: CompanyData = {
  name: "",
  category: undefined,
  description: undefined,
  logoId: undefined,
  stockTicker: undefined,
  websiteUrl: undefined,
  legalStructure: undefined,
  marketPosition: undefined,
  hqAddress: undefined,
  productsServices: undefined,
  incorporationYear: undefined,
  foundersAndLeadership: undefined,
  numEmployees: undefined,
  revenue: undefined,
  keyClientsPartners: undefined,
  investors: undefined,
  fundingStage: undefined,
  exitStrategyHistory: undefined,
  certificationsCompliance: undefined,
  riskScore: undefined,
  accreditationStatus: undefined,
  filesPublic: undefined,
  filesPrivate: undefined,
  registryDate: undefined,
  createdAt: undefined,
  updatedAt: undefined,
  onboardingCompanyCompleted: undefined,
};

interface DataFieldProps {
  label: string;
  value: any;
  isNew?: boolean;
}

const DataField = ({
  label,
  value,
  isNew = false,
}: DataFieldProps) => {
  const containerClasses = cn(
    "flex flex-col space-y-1",
    isNew && "bg-green-50 dark:bg-green-900/20 rounded-lg p-2"
  );

  const valueClasses = cn(
    "text-sm",
    isNew && "text-green-600 dark:text-green-400 font-medium"
  );

  if (Array.isArray(value)) {
    return (
      <div className={containerClasses}>
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className={valueClasses}>
          {value.length > 0 ? value.join(", ") : "Not found"}
        </div>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className={containerClasses}>
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className={valueClasses}>{value ? "Yes" : "No"}</span>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <span className="text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span className={valueClasses}>{value || "Not found"}</span>
    </div>
  );
};

const CompanyDataDisplay = ({
  data,
  previousData,
}: {
  data: CompanyData;
  previousData?: CompanyData;
}) => {
  const isFieldNew = (fieldName: keyof CompanyData) => {
    if (!previousData) return false;
    return data[fieldName] !== previousData[fieldName];
  };

  if (data.error) {
    return (
      <div className="p-4 text-center text-red-500">
        {data.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core Fields */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Core Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataField label="ID" value={data.id} isNew={isFieldNew("id")} />
          <DataField label="Name" value={data.name} isNew={isFieldNew("name")} />
          <DataField
            label="Category"
            value={data.category}
            isNew={isFieldNew("category")}
          />
          <DataField
            label="Description"
            value={data.description}
            isNew={isFieldNew("description")}
          />
          <DataField
            label="Logo ID"
            value={data.logoId}
            isNew={isFieldNew("logoId")}
          />
        </div>
      </div>

      {/* Business Information */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Business Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataField
            label="Stock Ticker"
            value={data.stockTicker}
            isNew={isFieldNew("stockTicker")}
          />
          <DataField
            label="Website"
            value={data.websiteUrl}
            isNew={isFieldNew("websiteUrl")}
          />
          <DataField
            label="Legal Structure"
            value={data.legalStructure}
            isNew={isFieldNew("legalStructure")}
          />
          <DataField
            label="Market Position"
            value={data.marketPosition}
            isNew={isFieldNew("marketPosition")}
          />
          <DataField
            label="HQ Address"
            value={data.hqAddress}
            isNew={isFieldNew("hqAddress")}
          />
          <DataField
            label="Products/Services"
            value={data.productsServices}
            isNew={isFieldNew("productsServices")}
          />
          <DataField
            label="Incorporation Year"
            value={data.incorporationYear}
            isNew={isFieldNew("incorporationYear")}
          />
          <DataField
            label="Founders & Leadership"
            value={data.foundersAndLeadership}
            isNew={isFieldNew("foundersAndLeadership")}
          />
          <DataField
            label="Number of Employees"
            value={data.numEmployees}
            isNew={isFieldNew("numEmployees")}
          />
          <DataField
            label="Revenue"
            value={data.revenue}
            isNew={isFieldNew("revenue")}
          />
        </div>
      </div>

      {/* Relationships & Status */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Relationships & Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataField
            label="Key Clients & Partners"
            value={data.keyClientsPartners}
            isNew={isFieldNew("keyClientsPartners")}
          />
          <DataField
            label="Investors"
            value={data.investors}
            isNew={isFieldNew("investors")}
          />
          <DataField
            label="Funding Stage"
            value={data.fundingStage}
            isNew={isFieldNew("fundingStage")}
          />
          <DataField
            label="Exit Strategy History"
            value={data.exitStrategyHistory}
            isNew={isFieldNew("exitStrategyHistory")}
          />
        </div>
      </div>

      {/* Compliance & Security */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Compliance & Security</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataField
            label="Certifications & Compliance"
            value={data.certificationsCompliance}
            isNew={isFieldNew("certificationsCompliance")}
          />
          <DataField
            label="Risk Score"
            value={data.riskScore}
            isNew={isFieldNew("riskScore")}
          />
          <DataField
            label="Accreditation Status"
            value={data.accreditationStatus}
            isNew={isFieldNew("accreditationStatus")}
          />
        </div>
      </div>

      {/* File Management */}
      <div>
        <h3 className="text-sm font-semibold mb-3">File Management</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataField
            label="Public Files"
            value={data.filesPublic}
            isNew={isFieldNew("filesPublic")}
          />
          <DataField
            label="Private Files"
            value={data.filesPrivate}
            isNew={isFieldNew("filesPrivate")}
          />
        </div>
      </div>

      {/* Timestamps & Additional Features */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Timestamps & Additional Features</h3>
        <div className="grid grid-cols-2 gap-4">
          <DataField
            label="Registry Date"
            value={data.registryDate}
            isNew={isFieldNew("registryDate")}
          />
          <DataField
            label="Created At"
            value={data.createdAt}
            isNew={isFieldNew("createdAt")}
          />
          <DataField
            label="Updated At"
            value={data.updatedAt}
            isNew={isFieldNew("updatedAt")}
          />
          <DataField
            label="Onboarding Completed"
            value={data.onboardingCompanyCompleted}
            isNew={isFieldNew("onboardingCompanyCompleted")}
          />
        </div>
      </div>
    </div>
  );
};

export const CompanySearchPlayground = () => {
  const [companyName, setCompanyName] = useState("");
  const [searchResult, setSearchResult] = useState<{
    company: CompanyData;
    previousData?: CompanyData;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    setIsLoading(true);
    setSearchStartTime(Date.now());
    setSearchResult(null);

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

      setSearchResult({
        company: data.company,
        previousData: data.isNewData ? searchResult?.company : undefined,
      });
    } catch (error) {
      console.error("[Search] Error:", error);
      setSearchResult({
        company: { name: companyName, error: "Search failed" },
        previousData: undefined,
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

      {/* Show empty state when no search has been performed */}
      {!searchResult && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Company Data Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyDataDisplay data={emptyCompanyData} />
          </CardContent>
        </Card>
      )}

      {/* Show search results or loading state */}
      {(searchResult || isLoading) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              searchResult && (
                <CompanyDataDisplay
                  data={searchResult.company}
                  previousData={searchResult.previousData}
                />
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};