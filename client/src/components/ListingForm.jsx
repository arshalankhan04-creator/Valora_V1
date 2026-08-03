import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid']
const TRANSMISSIONS = ['Manual', 'Automatic']
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

export default function ListingForm({
  initialValues = EMPTY_LISTING_FORM,
  onSubmit,
  submitting,
  error,
  submitLabel = 'Save',
  submittingLabel = 'Saving...',
  showImages = true,
}) {
  const [form, setForm] = useState(initialValues)
  const [images, setImages] = useState([])

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form, images)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Brand"
          value={form.brand}
          onChange={handleChange('brand')}
          required
        />
        <Input
          type="text"
          placeholder="Model"
          value={form.model}
          onChange={handleChange('model')}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder="Year"
          value={form.year}
          onChange={handleChange('year')}
          required
        />
        <Input
          type="number"
          placeholder="Km driven"
          value={form.kmDriven}
          onChange={handleChange('kmDriven')}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <select value={form.fuelType} onChange={handleChange('fuelType')} className={SELECT_CLASS}>
          {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={form.transmission} onChange={handleChange('transmission')} className={SELECT_CLASS}>
          {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <Input
        type="number"
        placeholder="Asking price (INR)"
        value={form.price}
        onChange={handleChange('price')}
        required
      />

      <Textarea
        placeholder="Description"
        value={form.description}
        onChange={handleChange('description')}
        rows={3}
      />

      {showImages && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-photos">Photos (up to 8)</Label>
          <label
            htmlFor="listing-photos"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <Upload className="size-4" />
            {images.length > 0 ? `${images.length} photo${images.length > 1 ? 's' : ''} selected` : 'Choose photos'}
          </label>
          <input
            id="listing-photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files).slice(0, 8))}
            className="sr-only"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  )
}
