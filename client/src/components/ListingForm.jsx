import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import BrandModelCombobox from './BrandModelCombobox'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid']
const TRANSMISSIONS = ['Manual', 'Automatic']
const CURRENT_YEAR = new Date().getFullYear()

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export const EMPTY_LISTING_FORM = {
  brand: '',
  model: '',
  year: '',
  kmDriven: '',
  fuelType: 'Petrol',
  transmission: 'Manual',
  price: '',
  description: '',
}

// Inline validation hints — soft warnings, never hard blocks
function useWarnings(form) {
  const warnings = {}
  const year = Number(form.year)
  const km = Number(form.kmDriven)
  const price = Number(form.price)

  if (form.year && (year < 1980 || year > CURRENT_YEAR)) {
    warnings.year = `Year should be between 1980 and ${CURRENT_YEAR}.`
  }
  if (form.kmDriven && km > 350000) {
    warnings.kmDriven = 'Over 3,50,000 km — double-check this figure.'
  }
  if (form.price && price < 50000) {
    warnings.price = 'Price seems very low — is this in rupees?'
  }
  if (form.price && price > 100000000) {
    warnings.price = 'Price exceeds ₹10 crore — double-check.'
  }
  return warnings
}

const DESCRIPTION_TEMPLATE = `Single owner. Bought in [year], used primarily for [city/highway] driving. Service history maintained at [authorised/local] service centre. No major accidents or repairs. Selling because [reason]. Tyres and brakes in good condition. All documents up to date.`

export default function ListingForm({
  initialValues = EMPTY_LISTING_FORM,
  existingImages = [],
  onSubmit,
  submitting,
  error,
  submitLabel = 'Save',
  submittingLabel = 'Saving...',
  showImages = true,
}) {
  const [form, setForm] = useState(initialValues)
  const [images, setImages] = useState([])
  const [descFocused, setDescFocused] = useState(false)
  const warnings = useWarnings(form)
  const isEdit = existingImages.length > 0

  const set = (key) => (val) =>
    setForm(prev => ({ ...prev, [key]: typeof val === 'string' ? val : val.target.value }))

  // Tab on empty description inserts template once
  const handleDescKeyDown = (e) => {
    if (e.key === 'Tab' && !form.description.trim()) {
      e.preventDefault()
      setForm(prev => ({ ...prev, description: DESCRIPTION_TEMPLATE }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (showImages && !isEdit && images.length === 0) return
    onSubmit(form, images)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Brand + Model */}
      <div className="flex flex-col gap-1.5">
        <Label>Brand &amp; Model</Label>
        <BrandModelCombobox
          brand={form.brand}
          model={form.model}
          onBrandChange={set('brand')}
          onModelChange={set('model')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-year">Year</Label>
          <Input
            id="field-year"
            type="number"
            placeholder={`e.g. 2020`}
            value={form.year}
            onChange={set('year')}
            min={1980}
            max={CURRENT_YEAR}
            required
          />
          {warnings.year && <p className="text-xs text-amber-500">{warnings.year}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-km">Km driven</Label>
          <Input
            id="field-km"
            type="number"
            placeholder="e.g. 45000"
            value={form.kmDriven}
            onChange={set('kmDriven')}
            min={0}
            required
          />
          {warnings.kmDriven && <p className="text-xs text-amber-500">{warnings.kmDriven}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-fuel">Fuel type</Label>
          <select id="field-fuel" value={form.fuelType} onChange={set('fuelType')} className={SELECT_CLASS}>
            {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-tx">Transmission</Label>
          <select id="field-tx" value={form.transmission} onChange={set('transmission')} className={SELECT_CLASS}>
            {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-price">Asking price (₹)</Label>
        <Input
          id="field-price"
          type="number"
          placeholder="e.g. 450000"
          value={form.price}
          onChange={set('price')}
          min={0}
          required
        />
        {warnings.price && <p className="text-xs text-amber-500">{warnings.price}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-desc">Description</Label>
        <Textarea
          id="field-desc"
          placeholder={descFocused ? '' : 'Describe your car — condition, service history, reason for selling.\nPress Tab to insert a template.'}
          value={form.description}
          onChange={set('description')}
          onFocus={() => setDescFocused(true)}
          onBlur={() => setDescFocused(false)}
          onKeyDown={handleDescKeyDown}
          rows={4}
        />
        {!descFocused && !form.description && (
          <p className="text-xs text-muted-foreground">
            A good description improves your Trust Score and reduces fraud flags.
          </p>
        )}
      </div>

      {showImages && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-photos">
            {isEdit ? 'Photos' : 'Photos'}{' '}
            <span className="text-muted-foreground font-normal">
              {isEdit ? '(upload new photos to replace all existing ones)' : '(1–8 · 3+ photos improves your score)'}
            </span>
          </Label>

          {/* Show existing photos on edit */}
          {isEdit && existingImages.length > 0 && images.length === 0 && (
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((img, i) => (
                <div key={i} className="relative aspect-video rounded-md overflow-hidden border border-border">
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${img}`}
                    alt={`Current photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* New photo preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((file, i) => (
                <div key={i} className="relative aspect-video rounded-md overflow-hidden border border-primary/40">
                  <img src={URL.createObjectURL(file)} alt={`New photo ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute top-1 right-1 rounded bg-primary/80 px-1 text-[10px] text-white font-medium">new</span>
                </div>
              ))}
            </div>
          )}

          <label
            htmlFor="listing-photos"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <Upload className="size-4" />
            {images.length > 0
              ? `${images.length} new photo${images.length > 1 ? 's' : ''} selected${images.length >= 3 ? ' ✓' : ' — add more for a better score'}`
              : isEdit ? 'Choose new photos to replace existing ones' : 'Choose photos'}
          </label>
          <input
            id="listing-photos"
            type="file"
            accept="image/*"
            multiple
            required={!isEdit}
            onChange={e => setImages(Array.from(e.target.files).slice(0, 8))}
            className="sr-only"
          />
          {!isEdit && images.length === 0 && (
            <p className="text-xs text-muted-foreground">At least one photo is required.</p>
          )}
          {isEdit && images.length > 0 && (
            <p className="text-xs text-amber-500">
              Saving will replace all {existingImages.length} existing photo{existingImages.length !== 1 ? 's' : ''} with these {images.length} new one{images.length !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting || (showImages && !isEdit && images.length === 0)}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  )
}
