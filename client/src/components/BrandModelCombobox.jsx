/**
 * BrandModelCombobox
 * Smart autocomplete for brand + model fields.
 * - Brand: fuzzy-filters all 100 catalogue brands as you type
 * - Model: only activates once brand is chosen; filters that brand's models
 * - Keyboard: ↑↓ to navigate, Enter/Tab to select, Escape to close
 * - Falls back gracefully: unknown brands/models are allowed (free-text)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import catalogue from '../data/car_catalogue.json'

const BRANDS = Object.keys(catalogue).sort()

function fuzzy(haystack, needle) {
  if (!needle) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function Dropdown({ items, activeIdx, onSelect, inputRef }) {
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current && activeIdx >= 0) {
      const el = listRef.current.children[activeIdx]
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  if (!items.length) return null

  return (
    <ul
      ref={listRef}
      role="listbox"
      className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-input bg-popover py-1 shadow-md"
    >
      {items.map((item, i) => (
        <li
          key={item}
          role="option"
          aria-selected={i === activeIdx}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
          className={[
            'cursor-pointer px-3 py-1.5 text-sm',
            i === activeIdx
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground hover:bg-accent hover:text-accent-foreground',
          ].join(' ')}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function ComboInput({ value, onChange, onSelect, suggestions, placeholder, disabled, id, inputRef }) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Reset active index when suggestions change
  useEffect(() => { setActiveIdx(-1) }, [suggestions])

  function handleKey(e) {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if ((e.key === 'Enter' || e.key === 'Tab') && activeIdx >= 0) {
      e.preventDefault()
      onSelect(suggestions[activeIdx])
      setOpen(false)
      setActiveIdx(-1)
    } else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        required
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && (
        <Dropdown
          items={suggestions}
          activeIdx={activeIdx}
          onSelect={item => { onSelect(item); setOpen(false); setActiveIdx(-1) }}
          inputRef={inputRef}
        />
      )}
    </div>
  )
}

export default function BrandModelCombobox({ brand, model, onBrandChange, onModelChange }) {
  const brandSuggestions = useMemo(
    () => BRANDS.filter(b => fuzzy(b, brand)).slice(0, 12),
    [brand],
  )

  const modelSuggestions = useMemo(() => {
    const entry = catalogue[brand]
    if (!entry) return []
    return entry.models.filter(m => fuzzy(m, model)).slice(0, 12)
  }, [brand, model])

  const brandKnown = !!catalogue[brand]

  function handleBrandSelect(val) {
    onBrandChange(val)
    // Clear model when brand changes so stale model doesn't persist
    onModelChange('')
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <ComboInput
          id="listing-brand"
          placeholder="Brand (e.g. Maruti Suzuki)"
          value={brand}
          onChange={onBrandChange}
          onSelect={handleBrandSelect}
          suggestions={brandSuggestions}
        />
        {brand && !brandKnown && (
          <p className="text-xs text-muted-foreground">
            Brand not in catalogue — you can still proceed.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <ComboInput
          id="listing-model"
          placeholder={brandKnown ? 'Model' : 'Enter brand first for suggestions'}
          value={model}
          onChange={onModelChange}
          onSelect={onModelChange}
          suggestions={modelSuggestions}
          disabled={false}
        />
        {brand && !brandKnown && (
          // spacer to keep grid aligned
          <p className="text-xs text-transparent select-none">.</p>
        )}
      </div>
    </div>
  )
}
