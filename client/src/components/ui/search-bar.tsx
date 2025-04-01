import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Fuse from "fuse.js"
import { Search, X } from "lucide-react"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  data?: any[]
  keys?: string[]
  onResults?: (results: any[]) => void
  onSearch?: (query: string) => void
  isGlobalSearch?: boolean
  containerClassName?: string
  contextualType?: string
}

export function SearchBar({
  data,
  keys,
  onResults,
  onSearch,
  isGlobalSearch,
  containerClassName,
  contextualType,
  className,
  ...props
}: SearchBarProps) {
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  
  // Debounce search query to reduce unnecessary searches during typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      onSearch && onSearch(query);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  React.useEffect(() => {
    if (data && keys && onResults) {
      // Only perform search if query is not empty
      if (debouncedQuery.trim() === "") {
        onResults([]);
        return;
      }
      
      const fuse = new Fuse(data, {
        keys,
        threshold: 0.3, // Lower threshold for more strict matching
        includeScore: true, // Include score in results
        ignoreLocation: true, // Search in the entire string
        minMatchCharLength: 2, // Minimum characters that need to match
      })
      
      const results = fuse.search(debouncedQuery)
      onResults(results)
    }
  }, [data, keys, debouncedQuery, onResults])

  const handleClear = () => {
    setQuery("");
    onSearch && onSearch("");
    onResults && onResults([]);
  };

  return (
    <div className={cn("relative", containerClassName)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        
        <Input
          type="search"
          placeholder={isGlobalSearch 
            ? "Search files, companies, and more..." 
            : props.placeholder || `Search ${contextualType || "items"}...`}
          className={cn(
            "h-9 w-full md:w-[300px] lg:w-[400px] pl-8",
            className
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          {...props}
        />
        
        {query.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-2.5 h-4 w-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Helper function can be imported and used where needed
// This avoids Fast Refresh issues with exporting multiple components
// from the same file
export const highlightSearchMatch = (text: string, matches?: any[]) => {
  if (!matches?.length) return text;

  // Extract indices from Fuse.js match format
  const indices = matches.reduce((acc: number[][], match) => {
    if (match.indices) {
      acc.push(...match.indices);
    }
    return acc;
  }, []);

  let lastIndex = 0;
  let result = "";

  indices.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
    result += text.slice(lastIndex, start);
    result += `<mark class="bg-yellow-200 dark:bg-yellow-800">${text.slice(
      start,
      end + 1
    )}</mark>`;
    lastIndex = end + 1;
  });

  result += text.slice(lastIndex);
  return result;
}
