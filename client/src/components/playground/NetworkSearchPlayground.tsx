import * as React from "react"
import { NetworkSearch } from "./NetworkSearch"

const sampleCompanies = [
  { name: "Acme Corporation", industry: "Technology" },
  { name: "Global Industries", industry: "Manufacturing" },
  { name: "Tech Solutions", industry: "Technology" },
  { name: "Future Enterprises", industry: "Finance" },
  { name: "Innovation Labs", industry: "Research" },
]

export default function NetworkSearchPlayground() {
  const [recentSearches, setRecentSearches] = React.useState<string[]>([
    "Digital Dynamics",
    "Cloud Systems",
    "Smart Solutions"
  ])
  const [selectedCompany, setSelectedCompany] = React.useState<string>("")

  const handleCompanySelect = (company: string) => {
    setSelectedCompany(company)
    if (!recentSearches.includes(company)) {
      setRecentSearches(prev => [company, ...prev].slice(0, 5))
    }
  }

  const handleAddNewCompany = (companyName: string) => {
    // In a real application, this would trigger an API call to add the company
    console.log("Adding new company:", companyName)
    handleCompanySelect(companyName)
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Network Search</p>
        <NetworkSearch 
          data={sampleCompanies}
          currentCompanyName="Invela"
          recentSearches={recentSearches}
          onCompanySelect={handleCompanySelect}
          onAddNewCompany={handleAddNewCompany}
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        />

        {selectedCompany && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Selected Company:</p>
            <p className="font-medium">{selectedCompany}</p>
          </div>
        )}
      </div>
    </div>
  )
}
