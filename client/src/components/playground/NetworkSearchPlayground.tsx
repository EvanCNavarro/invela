import * as React from "react"
import { NetworkSearch } from "./NetworkSearch"
import type { Company } from "@/types/company"

const sampleCompanies: Company[] = [
  { 
    id: 1,
    name: "Acme Corporation",
    category: "Technology",
    description: "Leading technology solutions provider",
    accreditationStatus: "APPROVED",
    riskScore: 85
  },
  { 
    id: 2,
    name: "Global Industries",
    category: "Manufacturing",
    description: "Global manufacturing solutions",
    accreditationStatus: "PENDING",
    riskScore: 75
  },
  { 
    id: 3,
    name: "Tech Solutions",
    category: "Technology",
    description: "Innovative tech solutions",
    accreditationStatus: "APPROVED",
    riskScore: 90
  }
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
          isValid={Boolean(selectedCompany)}
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