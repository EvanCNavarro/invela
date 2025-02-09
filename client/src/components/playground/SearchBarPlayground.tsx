import * as React from "react"
import { SearchBar } from "./SearchBar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SearchBarPlayground() {
  const [searchResults, setSearchResults] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Simulate a search API call
  const handleSearch = async (value: string) => {
    setIsLoading(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSearchResults(value ? [`Results for "${value}"`, "Item 1", "Item 2"] : [])
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Default Search Bar</CardTitle>
          <CardDescription>
            Basic search bar with left icon and clear button
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar 
            placeholder="Search..." 
            onSearch={console.log}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Right Icon Search Bar</CardTitle>
          <CardDescription>
            Search bar with right-aligned icon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar 
            placeholder="Search..."
            iconPosition="right"
            onSearch={console.log}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loading State Search Bar</CardTitle>
          <CardDescription>
            Search bar with simulated API loading state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar 
            placeholder="Type to search..."
            onSearch={handleSearch}
            isLoading={isLoading}
          />
          <div className="mt-4">
            {searchResults.map((result, index) => (
              <div key={index} className="py-2 px-4">
                {result}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Without Clear Button</CardTitle>
          <CardDescription>
            Search bar without the clear button functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar 
            placeholder="Search..."
            showClearButton={false}
            onSearch={console.log}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controlled Search Bar</CardTitle>
          <CardDescription>
            Search bar with external state control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar 
            placeholder="Controlled input..."
            value="Controlled value"
            onChange={(e) => console.log('Changed:', e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
