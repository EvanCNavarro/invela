import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Fuse from "fuse.js"

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  data?: any[]
  keys?: string[]
  onResults?: (results: any[]) => void
  isGlobalSearch?: boolean
  containerClassName?: string
}

export function SearchBar({
  data,
  keys,
  onResults,
  isGlobalSearch,
  containerClassName,
  className,
  ...props
}: SearchBarProps) {
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    if (data && keys && onResults) {
      const fuse = new Fuse(data, {
        keys,
        threshold: 0.3,
      })
      const results = fuse.search(query)
      onResults(results)
    }
  }, [data, keys, query, onResults])

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        type="search"
        placeholder={isGlobalSearch ? "Search files, companies, and more..." : props.placeholder}
        className={cn(
          "h-9 w-full md:w-[300px] lg:w-[400px]",
          isGlobalSearch && "pl-8",
          className
        )}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        {...props}
      />
    </div>
  )
}

export function highlightMatch(text: string, matches?: Fuse.FuseResultMatch[]) {
  if (!matches?.length) return text;

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
