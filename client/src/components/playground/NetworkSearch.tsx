import * as React from "react"
import { Search as SearchIcon, Plus, X, Check, AlertTriangle, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { Link } from "wouter"
import Fuse from 'fuse.js'
import type { Company } from "@/types/company"

const getCompanySlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export interface NetworkSearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  onSearch?: (value: string) => void
  isLoading?: boolean
  containerClassName?: string
  data: Company[]
  currentCompanyName?: string
  recentSearches?: string[]
  onCompanySelect?: (company: string) => void
  onAddNewCompany?: (companyName: string) => void
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  isValid?: boolean
  isError?: boolean
  existingCompany?: Company | null
  onExistingCompanyChange?: (company: Company | null) => void
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
  isValid = false,
  isError = false,
  existingCompany = null,
  onExistingCompanyChange,
  ...props
}: NetworkSearchProps) {
  const [value, setValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchResults, setSearchResults] = React.useState<Array<Fuse.FuseResult<Company>>>([])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Initialize Fuse instance for fuzzy search
  const fuse = React.useMemo(() => new Fuse(data, {
    keys: ['name', 'description'],
    threshold: 0.3,
    includeScore: true,
  }), [data])

  // Handle controlled vs uncontrolled input
  const inputValue = controlledValue !== undefined ? controlledValue : value
  const hasValue = Boolean(inputValue && inputValue.length > 0)

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    console.log('[NetworkSearch] handleChange:', { newValue, controlled: !!controlledOnChange })

    // Handle controlled input
    if (controlledOnChange) {
      console.log('[NetworkSearch] Calling controlled onChange')
      controlledOnChange(event)
    } else {
      console.log('[NetworkSearch] Setting internal value')
      setValue(newValue)
    }

    // Reset existing company when input changes
    if (onExistingCompanyChange) {
      onExistingCompanyChange(null)
    }

    // Handle search
    if (newValue) {
      const results = fuse.search(newValue)
      console.log('[NetworkSearch] Search results:', results)
      setSearchResults(results)
      setIsOpen(true)
    } else {
      setSearchResults([])
      setIsOpen(false)
    }
    onSearch?.(newValue)
  }, [controlledOnChange, onSearch, fuse, onExistingCompanyChange])

  const handleSelect = (companyName: string) => {
    console.log('[NetworkSearch] handleSelect:', { companyName, controlled: !!controlledOnChange })

    // Find the selected company in the data
    const selectedCompany = data.find(company => company.name === companyName)

    if (selectedCompany && onExistingCompanyChange) {
      onExistingCompanyChange(selectedCompany)
    }

    if (controlledOnChange) {
      const event = {
        target: { value: companyName }
      } as React.ChangeEvent<HTMLInputElement>
      console.log('[NetworkSearch] Calling controlled onChange with selected company')
      controlledOnChange(event)
    } else {
      console.log('[NetworkSearch] Setting internal value with selected company')
      setValue(companyName)
    }

    onCompanySelect?.(companyName)
    setIsOpen(false)
  }

  const handleAddNewCompany = () => {
    console.log('[NetworkSearch] Adding new company:', inputValue)

    // Clear existing company selection when adding new
    if (onExistingCompanyChange) {
      onExistingCompanyChange(null)
    }

    if (controlledOnChange) {
      const event = {
        target: { value: inputValue }
      } as React.ChangeEvent<HTMLInputElement>
      controlledOnChange(event)
    }

    onAddNewCompany?.(inputValue)
    setIsOpen(false)
  }

  const handleClear = React.useCallback(() => {
    console.log('[NetworkSearch] handleClear')
    if (controlledOnChange) {
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>
      controlledOnChange(event)
    } else {
      setValue('')
    }
    setSearchResults([])
    if (onExistingCompanyChange) {
      onExistingCompanyChange(null)
    }
    onSearch?.('')
    setIsOpen(false)
    inputRef.current?.focus()
  }, [controlledOnChange, onSearch, onExistingCompanyChange])

  // Close dropdown when clicking outside
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

  // Show warning if company exists
  const showWarning = existingCompany !== null && existingCompany !== undefined

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={cn("relative flex w-full items-center", containerClassName)}
      >
        {showWarning ? (
          <AlertTriangle
            className="absolute left-3 h-4 w-4 text-yellow-500 pointer-events-none"
          />
        ) : isValid ? (
          <Check
            className="absolute left-3 h-4 w-4 text-green-500 pointer-events-none"
          />
        ) : (
          <SearchIcon
            className={cn(
              "absolute left-3 h-4 w-4 pointer-events-none",
              isError ? "text-destructive" : "text-muted-foreground"
            )}
          />
        )}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => hasValue && setIsOpen(true)}
          placeholder="Add a new FinTech to network"
          className={cn(
            "pl-9 pr-[70px]",
            "focus:ring-2 focus:ring-offset-2",
            showWarning
              ? "border-yellow-500 focus:ring-yellow-500 focus:ring-offset-background"
              : isValid
                ? "border-green-500 focus:ring-green-500 focus:ring-offset-background"
                : isError
                  ? "border-destructive focus:ring-destructive focus:ring-offset-background"
                  : "focus:ring-ring focus:ring-offset-background",
            className
          )}
          {...props}
        />
        <div className="absolute right-3 flex items-center gap-2">
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
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
            "absolute left-0 right-0 top-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md z-50",
            !isOpen && "hidden"
          )}
        >
          {hasValue && searchResults.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-sm font-medium">Search Results</div>
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  className="flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelect(result.item.name)}
                >
                  <span className="flex-1 text-left">{result.item.name}</span>
                  {result.item.category && (
                    <span className="text-xs text-muted-foreground">{result.item.category}</span>
                  )}
                </button>
              ))}
            </>
          )}

          {hasValue && searchResults.length === 0 && (
            <>
              <div className="px-2 py-1.5 text-sm font-medium">No results found</div>
              <button
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={handleAddNewCompany}
              >
                <Plus className="h-4 w-4" />
                Add "{inputValue}" to Network
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning message for existing company */}
      {showWarning && existingCompany && (
        <Alert className="mt-2 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <div className="flex flex-col space-y-3">
            <AlertDescription>
              {existingCompany.name} already exists in your company's network. To invite users to an existing company,
              visit the company's profile page.
            </AlertDescription>
            <Link href={`/network/company/${getCompanySlug(existingCompany.name)}?tab=users`}>
              <Button variant="outline" size="sm" className="w-full justify-between">
                Go to {existingCompany.name}'s Profile
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Alert>
      )}
    </div>
  )
}