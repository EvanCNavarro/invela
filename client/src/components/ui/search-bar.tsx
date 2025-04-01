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
  const fuseRef = React.useRef<Fuse<any> | null>(null)
  
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
  
  // Debounce search query to reduce unnecessary searches during typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      onSearch && onSearch(query);
    }, 250); // Slightly faster response
    
    return () => clearTimeout(timer);
  }, [query, onSearch]);

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
