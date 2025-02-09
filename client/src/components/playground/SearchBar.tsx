import * as React from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  isLoading?: boolean
  showClearButton?: boolean
  iconPosition?: 'left' | 'right'
  debounceMs?: number
  containerClassName?: string
}

export function SearchBar({
  onSearch,
  isLoading = false,
  showClearButton = true,
  iconPosition = 'left',
  debounceMs = 300,
  containerClassName,
  className,
  value: controlledValue,
  onChange: controlledOnChange,
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

  return (
    <div className={cn("relative flex w-full items-center", containerClassName)}>
      {iconPosition === 'left' && (
        <SearchIcon 
          className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none"
        />
      )}
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        className={cn(
          iconPosition === 'left' ? "pl-9" : "pr-9",
          ((showClearButton && inputValue) || isLoading) && "pr-[70px]",
          className
        )}
        {...props}
      />
      {iconPosition === 'right' && !isLoading && !(showClearButton && inputValue) && (
        <SearchIcon 
          className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none"
        />
      )}
      <div className="absolute right-3 flex items-center gap-2">
        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
        {showClearButton && inputValue && !isLoading && (
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
