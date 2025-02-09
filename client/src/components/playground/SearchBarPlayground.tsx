import * as React from "react"
import { SearchBar, highlightMatch } from "./SearchBar"

const sampleCompanies = [
  { name: "Acme Corporation", industry: "Technology" },
  { name: "Global Industries", industry: "Manufacturing" },
  { name: "Tech Solutions", industry: "Technology" },
  { name: "Future Enterprises", industry: "Finance" },
]

export default function SearchBarPlayground() {
  const [isLoadingContextual, setIsLoadingContextual] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<any[]>([])

  // Simulate a search API call
  const handleSearch = async (value: string) => {
    setIsLoadingContextual(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoadingContextual(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Default State</p>
        <SearchBar 
          contextualType="companies"
          data={sampleCompanies}
          keys={['name', 'industry']}
          onResults={setSearchResults}
          onSearch={handleSearch}
        />
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Loading State</p>
        <SearchBar 
          contextualType="companies"
          isLoading={true}
          data={sampleCompanies}
          keys={['name', 'industry']}
          onResults={setSearchResults}
          onSearch={handleSearch}
        />
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">With Results</p>
        <SearchBar 
          contextualType="companies"
          isLoading={isLoadingContextual}
          data={sampleCompanies}
          keys={['name', 'industry']}
          onResults={setSearchResults}
          onSearch={handleSearch}
        />

        <div className="mt-4 space-y-2">
          {searchResults.map((result, index) => (
            <div 
              key={index} 
              className="py-2 px-4 bg-muted/50 rounded-md"
              dangerouslySetInnerHTML={{
                __html: highlightMatch(
                  `${result.item.name} - ${result.item.industry}`,
                  result.matches
                )
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}