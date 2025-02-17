import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
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
  websiteUrl?: string; // Moved here

  // Business Information
  stockTicker?: string;
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

const PulsingDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
  </span>
);

interface DataFieldProps {
  label: string;
  value: any;
  isNew?: boolean;
  isLoading?: boolean;
}

const DataField = ({
  label,
  value,
  isNew = false,
  isLoading = false,
}: DataFieldProps) => {
  const containerClasses = cn(
    "flex flex-col space-y-1",
    isNew && "bg-green-50 dark:bg-green-900/20 rounded-lg p-2"
  );

  const valueClasses = cn(
    "text-sm",
    isNew && "text-green-600 dark:text-green-400 font-medium"
  );

  if (isLoading) {
    return (
      <div className={containerClasses}>
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      </div>
    );
  }

  const renderValue = () => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : "Not found";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return value || "Not found";
  };

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {isNew && <PulsingDot />}
      </div>
      <span className={valueClasses}>{renderValue()}</span>
    </div>
  );
};

// Initial empty state
const emptyCompanyData: CompanyData = {
  name: "",
  category: undefined,
  description: undefined,
  logoId: undefined,
  websiteUrl: undefined,
  stockTicker: undefined,
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

const CompanyDataDisplay = ({
  data,
  previousData,
  loadingFields = [],
}: {
  data: CompanyData;
  previousData?: CompanyData;
  loadingFields?: string[];
}) => {
  const isFieldNew = (fieldName: keyof CompanyData) => {
    if (!previousData) return false;
    return data[fieldName] !== previousData[fieldName];
  };

  const isFieldLoading = (fieldName: string) => {
    const isEmpty = !data[fieldName as keyof CompanyData] || 
                   (typeof data[fieldName as keyof CompanyData] === 'string' && 
                    data[fieldName as keyof CompanyData].toString().trim() === '') ||
                   (Array.isArray(data[fieldName as keyof CompanyData]) && 
                    data[fieldName as keyof CompanyData].length === 0);
    return isEmpty && loadingFields.includes(fieldName);
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
            isLoading={isFieldLoading("description")}
          />
          <DataField
            label="Website"
            value={data.websiteUrl}
            isNew={isFieldNew("websiteUrl")}
            isLoading={isFieldLoading("websiteUrl")}
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
            isLoading={isFieldLoading("stockTicker")}
          />
          <DataField
            label="Legal Structure"
            value={data.legalStructure}
            isNew={isFieldNew("legalStructure")}
            isLoading={isFieldLoading("legalStructure")}
          />
          <DataField
            label="Market Position"
            value={data.marketPosition}
            isNew={isFieldNew("marketPosition")}
            isLoading={isFieldLoading("marketPosition")}
          />
          <DataField
            label="HQ Address"
            value={data.hqAddress}
            isNew={isFieldNew("hqAddress")}
            isLoading={isFieldLoading("hqAddress")}
          />
          <DataField
            label="Products/Services"
            value={data.productsServices}
            isNew={isFieldNew("productsServices")}
            isLoading={isFieldLoading("productsServices")}
          />
          <DataField
            label="Incorporation Year"
            value={data.incorporationYear}
            isNew={isFieldNew("incorporationYear")}
            isLoading={isFieldLoading("incorporationYear")}
          />
          <DataField
            label="Founders & Leadership"
            value={data.foundersAndLeadership}
            isNew={isFieldNew("foundersAndLeadership")}
            isLoading={isFieldLoading("foundersAndLeadership")}
          />
          <DataField
            label="Number of Employees"
            value={data.numEmployees}
            isNew={isFieldNew("numEmployees")}
            isLoading={isFieldLoading("numEmployees")}
          />
          <DataField
            label="Revenue"
            value={data.revenue}
            isNew={isFieldNew("revenue")}
            isLoading={isFieldLoading("revenue")}
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
            isLoading={isFieldLoading("keyClientsPartners")}
          />
          <DataField
            label="Investors"
            value={data.investors}
            isNew={isFieldNew("investors")}
            isLoading={isFieldLoading("investors")}
          />
          <DataField
            label="Funding Stage"
            value={data.fundingStage}
            isNew={isFieldNew("fundingStage")}
            isLoading={isFieldLoading("fundingStage")}
          />
          <DataField
            label="Exit Strategy History"
            value={data.exitStrategyHistory}
            isNew={isFieldNew("exitStrategyHistory")}
            isLoading={isFieldLoading("exitStrategyHistory")}
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
            isLoading={isFieldLoading("certificationsCompliance")}
          />
          <DataField
            label="Risk Score"
            value={data.riskScore}
            isNew={isFieldNew("riskScore")}
            isLoading={isFieldLoading("riskScore")}
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

// Export as both named and default export
export const CompanySearchPlayground = () => {
  const [companyName, setCompanyName] = useState("");
  const [searchResult, setSearchResult] = useState<{
    company: CompanyData;
    previousData?: CompanyData;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [loadingFields, setLoadingFields] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!companyName.trim()) return;

    console.log("[Search] 🔍 Initializing search process...");
    setIsLoading(true);
    setSearchStartTime(Date.now());

    try {
      console.log(`[Search] 📝 Starting search for company: ${companyName}`);
      const startTime = Date.now();

      // Start with empty data, keeping just the company name
      console.log("[Search] 🏗️ Setting up initial empty data structure");
      const initialData = { ...emptyCompanyData, name: companyName };
      setSearchResult({
        company: initialData,
        previousData: undefined,
      });

      // Define searchable fields that will be queried via OpenAI
      const searchableFields = [
        'description', 'websiteUrl', 'legalStructure', 'hqAddress',
        'productsServices', 'incorporationYear', 'foundersAndLeadership',
        'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
        'fundingStage', 'certificationsCompliance'
      ];

      // Only show loading for fields that are both empty and will be searched
      const missingFields = searchableFields.filter(field => {
        const value = initialData[field as keyof CompanyData];
        return value === undefined || value === null || 
               (typeof value === 'string' && value.trim() === '') ||
               (Array.isArray(value) && value.length === 0);
      });

      console.log("[Search] 🔍 Missing fields to search:", missingFields);
      setLoadingFields(missingFields);

      console.log("[Search] 🌐 Making API request to company search endpoint");
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
      console.log(`[Search] ✅ Search completed in ${endTime - startTime}ms`);
      console.log("[Search] 📊 Search results:", data);

      // Update search results with visual indicators for changes
      console.log("[Search] 🎨 Updating UI with search results and visual indicators");
      setSearchResult({
        company: data.company,
        previousData: data.isNewData ? searchResult?.company : undefined,
      });
    } catch (error) {
      console.error("[Search] ❌ Error during search:", error);
      setSearchResult({
        company: { name: companyName, error: "Search failed" },
        previousData: undefined,
      });
    } finally {
      console.log("[Search] 🏁 Cleaning up search process");
      setIsLoading(false);
      setSearchStartTime(null);
      setLoadingFields([]);
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
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {searchResult ? "Search Results" : "Company Data Structure"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyDataDisplay
            data={searchResult?.company || emptyCompanyData}
            previousData={searchResult?.previousData}
            loadingFields={loadingFields}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySearchPlayground;