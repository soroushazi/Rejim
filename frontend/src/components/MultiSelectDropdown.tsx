import { useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Option = { id: number; name: string; description?: string }

type MultiSelectDropdownProps = {
  label: string
  options: Option[]
  selected: string[]
  onChange: (next: string[]) => void
  className?: string
  /** Adds a search box at the top of the dropdown to filter long option lists. */
  searchable?: boolean
  /** When set, a search with no matches offers `Add "<query>"` instead of
   * the plain "No matches." message - the caller owns what happens next
   * (typically opening a small dialog to also capture a description before
   * creating the option). Only takes effect with `searchable`. */
  onCreateNew?: (query: string) => void
  /** Button text while nothing is selected (defaults to `label`) - e.g. an
   * example-led prompt for someone who doesn't know the vocabulary yet. */
  placeholder?: string
  /** Placeholder for the search box (defaults to "Search…"). */
  searchPlaceholder?: string
  /** Shows the selected options' names on the button instead of
   * "<label> (N)" - for short lists where seeing the picks matters. */
  showSelectedNames?: boolean
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  className,
  searchable,
  onCreateNew,
  placeholder,
  searchPlaceholder,
  showSelectedNames,
}: MultiSelectDropdownProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id])
  }

  const filtered = searchable && query.trim()
    ? options.filter((opt) => opt.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'w-full justify-between rounded-full font-normal',
            selected.length > 0 && 'border-primary text-primary',
            className,
          )}
        >
          <span className="min-w-0 truncate">
            {selected.length === 0
              ? (placeholder ?? label)
              : showSelectedNames
                ? options
                    .filter((opt) => selected.includes(String(opt.id)))
                    .map((opt) => opt.name)
                    .join(', ')
                : `${label} (${selected.length})`}
          </span>
          <ChevronDown className="size-3.5 opacity-60" data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {searchable && (
          <div className="p-1">
            <Input
              ref={inputRef}
              type="search"
              placeholder={searchPlaceholder ?? 'Search…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
              className="h-7"
            />
          </div>
        )}
        {searchable && filtered.length === 0 && (
          query.trim() && onCreateNew ? (
            <DropdownMenuItem onSelect={() => onCreateNew(query.trim())}>
              <Plus className="size-3.5" />
              Add "{query.trim()}"
            </DropdownMenuItem>
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>
          )
        )}
        {filtered.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.id}
            checked={selected.includes(String(opt.id))}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(String(opt.id))}
          >
            <div className="flex flex-col">
              <span>{opt.name}</span>
              {opt.description && (
                <span className="text-xs font-normal text-muted-foreground">{opt.description}</span>
              )}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
