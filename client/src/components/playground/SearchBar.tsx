import * as React from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  isLoading?: boolean
  isGlobalSearch?: boolean
  contextualType?: string
  debounceMs?: number
  containerClassName?: string
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
  ...props
}: SearchBarProps) {
  const [value, setValue] = React.useState('')
  const [debouncedValue, setDebouncedValue] = React.useState('')
  const debounceTimeout = React.useRef<NodeJS.Timeout>()

  // Handle controlled vs uncontrolled input
  const inputValue = controlledValue !== undefined ? controlledValue : value

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
      onSearch?.(newValue)
    }, debounceMs)
  }, [controlledOnChange, debounceMs, onSearch])

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
    onSearch?.('')
  }, [controlledOnChange, onSearch])

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
    if (isGlobalSearch) return "Search Invela"
    if (contextualType) return `Search for ${contextualType}`
    return placeholder || "Search..."
  }

  return (
    <div className={cn("relative flex w-full items-center", containerClassName)}>
      <SearchIcon 
        className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none"
      />
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={getPlaceholder()}
        className={cn(
          "pl-9 pr-[70px]",
          className
        )}
        {...props}
      />
      <div className="absolute right-3 flex items-center gap-2">
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
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