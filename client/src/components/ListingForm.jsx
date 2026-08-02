import { useState } from 'react'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid']
const TRANSMISSIONS = ['Manual', 'Automatic']

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
        <input
          type="text"
          placeholder="Brand"
          value={form.brand}
          onChange={handleChange('brand')}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Model"
          value={form.model}
          onChange={handleChange('model')}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Year"
          value={form.year}
          onChange={handleChange('year')}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
        <input
          type="number"
          placeholder="Km driven"
          value={form.kmDriven}
          onChange={handleChange('kmDriven')}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <select
          value={form.fuelType}
          onChange={handleChange('fuelType')}
          className="border border-gray-300 rounded px-3 py-2"
        >
          {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={form.transmission}
          onChange={handleChange('transmission')}
          className="border border-gray-300 rounded px-3 py-2"
        >
          {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <input
        type="number"
        placeholder="Asking price (INR)"
        value={form.price}
        onChange={handleChange('price')}
        className="border border-gray-300 rounded px-3 py-2"
        required
      />

      <textarea
        placeholder="Description"
        value={form.description}
        onChange={handleChange('description')}
        className="border border-gray-300 rounded px-3 py-2"
        rows={3}
      />

      {showImages && (
        <div>
          <label className="block text-sm text-gray-600 mb-1">Photos (up to 8)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files).slice(0, 8))}
            className="text-sm"
          />
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-gray-900 text-white rounded px-3 py-2 disabled:opacity-50"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}
