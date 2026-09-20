import { useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Option = { id: number; name: string; description?: string }

type SearchableSelectProps = {
  placeholder: string
  options: Option[]
  value: number | null
  onChange: (id: number) => void
  className?: string
  /** A search with no matches offers `Add "<query>"` instead of the plain "No
   * matches." message - the caller owns what happens next (typically opening a
   * small dialog to also capture other fields before creating the option). */
  onCreateNew?: (query: string) => void
}

/** Single-choice sibling of MultiSelectDropdown (which is checkbox-based multi-select -
 * doesn't map cleanly onto a single pick): same visual language and onCreateNew
 * pattern, but selecting an option immediately sets the value and closes the menu. */
export default function SearchableSelect({
  placeholder,
  options,
  value,
  onChange,
  className,
  onCreateNew,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((opt) => opt.id === value) ?? null

  const filtered = query.trim()
    ? options.filter((opt) => opt.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('w-full justify-between rounded-full font-normal', selected && 'border-primary text-primary', className)}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <div className="p-1">
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
            className="h-7"
          />
        </div>
        {filtered.length === 0 &&
          (query.trim() && onCreateNew ? (
            <DropdownMenuItem onSelect={() => onCreateNew(query.trim())}>
              <Plus className="size-3.5" />
              Add "{query.trim()}"
            </DropdownMenuItem>
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</p>
          ))}
        {filtered.map((opt) => (
          <DropdownMenuItem key={opt.id} onSelect={() => onChange(opt.id)}>
            <div className="flex flex-col">
              <span>{opt.name}</span>
              {opt.description && <span className="text-xs font-normal text-muted-foreground">{opt.description}</span>}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
