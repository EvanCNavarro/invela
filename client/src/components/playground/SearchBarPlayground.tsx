import * as React from "react"
import { SearchBar, highlightMatch } from "./SearchBar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const sampleCompanies = [
  { name: "Acme Corporation", industry: "Technology" },
  { name: "Global Industries", industry: "Manufacturing" },
  { name: "Tech Solutions", industry: "Technology" },
  { name: "Future Enterprises", industry: "Finance" },
]

export function SearchBarPlayground() {
  const [searchType, setSearchType] = React.useState<'standard' | 'global'>('standard')
  const [isLoadingGlobal, setIsLoadingGlobal] = React.useState(false)
  const [isLoadingContextual, setIsLoadingContextual] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<any[]>([])

  // Simulate a search API call
  const handleSearch = async (value: string, setLoading: (loading: boolean) => void) => {
    setLoading(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-sm font-medium">Search Type</p>
        <ToggleGroup
          type="single"
          value={searchType}
          onValueChange={(value) => setSearchType(value as 'standard' | 'global')}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
        >
          <ToggleGroupItem
            value="standard"
            aria-label="Standard Search"
            className={cn(
              "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              "data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow",
              "hover:bg-background/50"
            )}
          >
            Standard Search
          </ToggleGroupItem>
          <ToggleGroupItem
            value="global"
            aria-label="Global Search"
            className={cn(
              "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              "data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow",
              "hover:bg-background/50"
            )}
          >
            Global App Search
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {searchType === 'standard' ? (
        <Card>
          <CardHeader>
            <CardTitle>Contextual Search</CardTitle>
            <CardDescription>
              Context-specific search with fuzzy matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchBar 
              contextualType="companies"
              isLoading={isLoadingContextual}
              data={sampleCompanies}
              keys={['name', 'industry']}
              onResults={setSearchResults}
              onSearch={(value) => handleSearch(value, setIsLoadingContextual)}
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Global Search</CardTitle>
            <CardDescription>
              Application-wide search functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchBar 
              isGlobalSearch
              isLoading={isLoadingGlobal}
              onSearch={(value) => handleSearch(value, setIsLoadingGlobal)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}