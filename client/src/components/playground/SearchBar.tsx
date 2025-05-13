import * as React from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import Fuse from 'fuse.js'

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  isLoading?: boolean
  isGlobalSearch?: boolean
  contextualType?: string
  debounceMs?: number
  containerClassName?: string
  data?: any[]
  keys?: string[]
  onResults?: (results: any[]) => void
}

export function SearchBar({
  onSearch,
  isLoading = false,
  isGlobalSearch = false,
  contextualType,
  debounceMs = 300,
  containerClassName,
  className,
  value: controlledValue,
  onChange: controlledOnChange,
  placeholder,
  data,
  keys,
  onResults,
  ...props
}: SearchBarProps) {
  const [value, setValue] = React.useState('')
  const [debouncedValue, setDebouncedValue] = React.useState('')
  const debounceTimeout = React.useRef<NodeJS.Timeout>()
  const fuse = React.useMemo(() => {
    if (data && keys) {
      return new Fuse(data, {
        keys,
        threshold: 0.3,
        includeMatches: true
      })
    }
    return null
  }, [data, keys])

  // Handle controlled vs uncontrolled input
  const inputValue = controlledValue !== undefined ? controlledValue : value
  const hasValue = inputValue !== '';

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value

    // Handle controlled input
    if (controlledOnChange) {
      controlledOnChange(event)
    } else {
      setValue(newValue)
    }

    // Handle debounced search
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedValue(newValue)
      if (fuse && newValue) {
        const results = fuse.search(newValue)
        onResults?.(results)
      } else if (!newValue) {
        onResults?.([])
      }
      onSearch?.(newValue)
    }, debounceMs)
  }, [controlledOnChange, debounceMs, onSearch, fuse, onResults])

  const handleClear = React.useCallback(() => {
    if (controlledOnChange) {
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>
      controlledOnChange(event)
    } else {
      setValue('')
    }
    setDebouncedValue('')
    onResults?.([])
    onSearch?.('')
  }, [controlledOnChange, onSearch, onResults])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  // Determine placeholder text
  const getPlaceholder = () => {
    if (isLoading) return "Loading..."
    if (isGlobalSearch) return "Search Invela Trust Network..."
    if (contextualType) return `Search for ${contextualType}`
    return placeholder || "Search..."
  }

  return (
    <div className={cn("relative flex w-full items-center min-w-0 bg-white dark:bg-zinc-950 rounded-full border shadow-sm", containerClassName)}>
      <SearchIcon 
        className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none"
      />
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={getPlaceholder()}
        className={cn(
          "pl-10 pr-[70px] text-sm w-full h-10 rounded-full border-none bg-transparent shadow-none",
          className
        )}
        style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          width: '100%'
        }}
        autoFocus={false}
        {...props}
      />
      <div className="absolute right-3 flex items-center gap-2">
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : hasValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Define the types for Fuse matches
interface FuseIndices {
  indices: [number, number][];
}

// Utility function to highlight matched text
export function highlightMatch(text: string, matches: FuseIndices[]) {
  if (!matches?.length) return text

  const indices = matches.reduce<[number, number][]>((acc, match) => {
    return [...acc, ...(match.indices || [])]
  }, []).sort((a, b) => a[0] - b[0])

  let result = ''
  let lastIndex = 0

  indices.forEach(([start, end]) => {
    result += text.slice(lastIndex, start)
    result += `<span class="bg-blue-100 dark:bg-blue-900">${text.slice(start, end + 1)}</span>`
    lastIndex = end + 1
  })

  result += text.slice(lastIndex)
  return result
}