import * as React from "react"
import { SearchBar } from "./SearchBar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SearchBarPlayground() {
  const [isLoadingGlobal, setIsLoadingGlobal] = React.useState(false)
  const [isLoadingContextual, setIsLoadingContextual] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<string[]>([])

  // Simulate a search API call
  const handleSearch = async (value: string, setLoading: (loading: boolean) => void) => {
    setLoading(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSearchResults(value ? [`Results for "${value}"`, "Item 1", "Item 2"] : [])
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Global Search</CardTitle>
          <CardDescription>
            Application-wide search component for the top navigation bar
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

      <Card>
        <CardHeader>
          <CardTitle>Contextual Search</CardTitle>
          <CardDescription>
            Context-specific search for tables and filtered views
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">Company Search</p>
            <SearchBar 
              contextualType="companies"
              isLoading={isLoadingContextual}
              onSearch={(value) => handleSearch(value, setIsLoadingContextual)}
            />
          </div>

          <div className="mt-4">
            {searchResults.map((result, index) => (
              <div key={index} className="py-2 px-4">
                {result}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}