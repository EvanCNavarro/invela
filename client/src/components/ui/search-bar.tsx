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
  isLoading?: boolean
  isGlobalSearch?: boolean
  containerClassName?: string
  contextualType?: string
  debounceMs?: number
}

export function SearchBar({
  data,
  keys,
  onResults,
  onSearch,
  isLoading = false,
  isGlobalSearch,
  containerClassName,
  contextualType,
  debounceMs = 300,
  className,
  value: controlledValue,
  onChange: controlledOnChange,
  placeholder,
  ...props
}: SearchBarProps) {
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const debounceTimeout = React.useRef<NodeJS.Timeout>()
  const fuseRef = React.useRef<Fuse<any> | null>(null)
  
  // Handle controlled vs uncontrolled input
  const inputValue = controlledValue !== undefined ? controlledValue : query
  const hasValue = inputValue !== ''
  
  // Initialize Fuse instance when data or keys change
  React.useEffect(() => {
    if (data && keys) {
      fuseRef.current = new Fuse(data, {
        keys,
        threshold: 0.4, // More lenient threshold for better fuzzy matching
        includeScore: true,
        includeMatches: true, // Include match information for highlighting
        ignoreLocation: true, // Search in the entire string
        useExtendedSearch: true, // Enable extended search
        minMatchCharLength: 1, // More sensitive matching
        distance: 150, // Allow for more distance between matched characters
        location: 0, // Start position of matched characters
        findAllMatches: true, // Find all matches rather than stopping at first
        shouldSort: true // Sort by relevance
      })
    }
  }, [data, keys])
  
  // Enhanced debounced search with proper cleanup
  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value

    // Handle controlled input
    if (controlledOnChange) {
      controlledOnChange(event)
    } else {
      setQuery(newValue)
    }

    // Handle debounced search with proper timeout management
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(newValue)
      if (fuseRef.current && newValue) {
        const results = fuseRef.current.search(newValue)
        onResults?.(results)
      } else if (!newValue) {
        onResults?.([])
      }
      onSearch?.(newValue)
    }, debounceMs)
  }, [controlledOnChange, debounceMs, onSearch, onResults])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (fuseRef.current && onResults) {
      if (debouncedQuery.trim() === "") {
        onResults([]);
        return;
      }
      
      try {
        // For multi-term search, split query and search each term
        const terms = debouncedQuery.trim().split(/\s+/).filter(Boolean);
        
        if (terms.length > 1) {
          // Handling multi-term search for better results
          const allResults = terms.flatMap(term => 
            fuseRef.current?.search(term) || []
          );
          
          // Deduplicate results by item id
          const uniqueResults = Array.from(
            new Map(allResults.map(item => [item.item.id, item])).values()
          );
          
          // Sort by relevance (score)
          const sortedResults = uniqueResults.sort((a, b) => 
            (a.score || 1) - (b.score || 1)
          );
          
          onResults(sortedResults);
        } else {
          // Single term search is simpler
          const results = fuseRef.current.search(debouncedQuery);
          onResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
        onResults([]);
      }
    }
  }, [debouncedQuery, onResults]);

  const handleClear = React.useCallback(() => {
    if (controlledOnChange) {
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>
      controlledOnChange(event)
    } else {
      setQuery('')
    }
    setDebouncedQuery('')
    onResults?.([])
    onSearch?.('')
  }, [controlledOnChange, onSearch, onResults])

  // Determine placeholder text
  const getPlaceholder = () => {
    if (isLoading) return "Loading..."
    if (isGlobalSearch) return "Search Invela Trust Network..."
    if (contextualType) return `Search for ${contextualType}`
    return placeholder || "Search..."
  }

  return (
    <div className={cn("relative flex w-full items-center min-w-0 bg-white dark:bg-zinc-950 rounded-full border shadow-sm", containerClassName)}>
      <Search className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
      
      <Input
        type="text"
        placeholder={getPlaceholder()}
        value={inputValue}
        onChange={handleChange}
        className={cn(
          "h-11 w-full bg-transparent border-0 pl-12 pr-12 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full",
          className
        )}
        disabled={isLoading}
        {...props}
      />
      
      {hasValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Helper function to safely highlight matched text
export const highlightSearchMatch = (text: string, matches?: any) => {
  if (!text) return "";
  
  if (!matches?.length) return text;
  
  try {
    // Extract indices from Fuse.js match format, handling potential undefined values safely
    const indices: number[][] = [];
    
    // Process matches array to extract all indices
    matches.forEach((match: any) => {
      if (match && match.indices && Array.isArray(match.indices)) {
        indices.push(...match.indices);
      }
    });
    
    if (indices.length === 0) return text;
    
    // Merge overlapping indices to prevent broken HTML
    const mergedIndices = mergeOverlappingRanges(indices);
    
    let lastIndex = 0;
    let result = "";
    
    mergedIndices.forEach(([start, end]) => {
      // Safety checks for invalid indices
      if (typeof start !== 'number' || typeof end !== 'number' || 
          start < 0 || end >= text.length || start > end) {
        return;
      }
      
      result += text.slice(lastIndex, start);
      result += `<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">${text.slice(
        start,
        end + 1
      )}</mark>`;
      lastIndex = end + 1;
    });
    
    result += text.slice(lastIndex);
    return result;
  } catch (error) {
    console.error("Error highlighting match:", error);
    return text; // Return original text if highlighting fails
  }
};

// Helper function to merge overlapping ranges
function mergeOverlappingRanges(ranges: number[][]): number[][] {
  if (!ranges.length) return [];
  
  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a[0] - b[0]);
  
  const result: number[][] = [sortedRanges[0]];
  
  for (let i = 1; i < sortedRanges.length; i++) {
    const current = sortedRanges[i];
    const lastMerged = result[result.length - 1];
    
    // Check if current range overlaps with the last merged range
    if (current[0] <= lastMerged[1] + 1) {
      // Merge by updating the end of the last range if needed
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      // No overlap, add as a new range
      result.push(current);
    }
  }
  
  return result;
}
