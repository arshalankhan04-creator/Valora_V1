import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getListing, updateListing } from '../services/listings'
import { useAuth } from '../context/AuthContext'
import ListingForm from '../components/ListingForm'

export default function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    getListing(id)
      .then(setListing)
      .catch(() => setLoadError('Listing not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="px-6 py-12 text-gray-500">Loading...</p>
  if (loadError) return <p className="px-6 py-12 text-red-600">{loadError}</p>

  const sellerId = listing.seller?._id || listing.seller
  const isOwner = sellerId === user.id
  if (!isOwner && user.role !== 'admin') {
    return <p className="px-6 py-12 text-red-600">This isn't your listing to edit.</p>
  }

  const initialValues = {
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    kmDriven: listing.kmDriven,
    fuelType: listing.fuelType,
    transmission: listing.transmission,
    price: listing.price,
    description: listing.description || '',
  }

  const handleSubmit = async (form) => {
    setSubmitError('')
    setSubmitting(true)
    try {
      await updateListing(id, form)
      navigate('/my-listings')
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not update listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="px-6 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Edit listing</h1>
      <p className="text-sm text-gray-500 mb-6">
        Changing details here won't re-run the price, fraud, or condition analysis — if this
        listing is flagged, it stays flagged until an admin reviews it.
      </p>
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={submitError}
        submitLabel="Save changes"
        submittingLabel="Saving..."
        showImages={false}
      />
    </section>
  )
}
