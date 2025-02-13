import * as React from "react"
import { Search as SearchIcon, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import Fuse from 'fuse.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface NetworkSearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  onSearch?: (value: string) => void
  isLoading?: boolean
  containerClassName?: string
  data?: any[]
  currentCompanyName?: string
  recentSearches?: string[]
  onCompanySelect?: (company: string) => void
  onAddNewCompany?: (companyName: string) => void
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function NetworkSearch({
  onSearch,
  isLoading = false,
  containerClassName,
  className,
  value: controlledValue,
  onChange: controlledOnChange,
  data = [],
  currentCompanyName = "Company",
  recentSearches = [],
  onCompanySelect,
  onAddNewCompany,
  ...props
}: NetworkSearchProps) {
  const [value, setValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const fuse = React.useMemo(() => {
    return new Fuse(data, {
      keys: ['name'],
      threshold: 0.3,
    })
  }, [data])

  // Handle controlled vs uncontrolled input
  const inputValue = controlledValue !== undefined ? controlledValue : value
  const hasValue = Boolean(inputValue && inputValue.length > 0)

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value

    // Handle controlled input
    if (controlledOnChange) {
      controlledOnChange(event)
    } else {
      setValue(newValue)
    }

    // Handle search
    if (newValue && fuse) {
      const results = fuse.search(newValue)
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
    onSearch?.(newValue)
  }, [controlledOnChange, onSearch, fuse])

  const handleSelect = (companyName: string) => {
    if (controlledOnChange) {
      const event = {
        target: { value: companyName }
      } as React.ChangeEvent<HTMLInputElement>
      controlledOnChange(event)
    } else {
      setValue(companyName)
    }
    onCompanySelect?.(companyName)
    setIsOpen(false)
  }

  const handleClear = React.useCallback(() => {
    if (controlledOnChange) {
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>
      controlledOnChange(event)
    } else {
      setValue('')
    }
    setSearchResults([])
    onSearch?.('')
    inputRef.current?.focus() // Keep focus after clearing
  }, [controlledOnChange, onSearch])

  const handleAddNew = React.useCallback(() => {
    if (inputValue) {
      onAddNewCompany?.(inputValue)
      handleSelect(inputValue)
    }
  }, [inputValue, onAddNewCompany])

  // Focus and blur handlers
  const handleFocus = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  // Handle clicks outside the component
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className={cn("relative flex w-full items-center", containerClassName)}
    >
      <SearchIcon 
        className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none"
      />
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder="Search Network"
        className={cn(
          "pl-9 pr-[70px]",
          "focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:ring-offset-background",
          className
        )}
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

      {/* Dropdown menu */}
      <div
        className={cn(
          "absolute left-0 right-0 top-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md",
          !isOpen && "hidden"
        )}
      >
        {!hasValue && recentSearches.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-sm font-medium">Recent Searches</div>
            {recentSearches.slice(0, 5).map((company, index) => (
              <button
                key={index}
                className="flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSelect(company)}
              >
                {company}
              </button>
            ))}
            <div className="mx-2 my-1 border-t" />
          </>
        )}

        {!hasValue && recentSearches.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No recent searches
          </div>
        )}

        {hasValue && searchResults.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-sm font-medium">Search Results</div>
            {searchResults.map((result, index) => (
              <button
                key={index}
                className="flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSelect(result.item.name)}
              >
                {result.item.name}
              </button>
            ))}
          </>
        )}

        {hasValue && searchResults.length === 0 && (
          <>
            <div className="px-2 py-1.5 text-sm font-medium">No results found</div>
            <button
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={handleAddNew}
            >
              <Plus className="h-4 w-4" />
              Add "{inputValue}" to {currentCompanyName}'s Network
            </button>
          </>
        )}
      </div>
    </div>
  )
}