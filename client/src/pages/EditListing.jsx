import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getListing, updateListing } from '../services/listings'
import { useAuth } from '../context/AuthContext'
import ListingForm from '../components/ListingForm'
import BackButton from '../components/BackButton'

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

  if (loading) {
    return (
      <section className="mx-auto max-w-lg px-6 py-8">
        <BackButton fallback="/my-listings" className="mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </section>
    )
  }
  if (loadError) {
    return (
      <section className="mx-auto max-w-lg px-6 py-8">
        <BackButton fallback="/my-listings" className="mb-4" />
        <p className="text-destructive">{loadError}</p>
      </section>
    )
  }

  const sellerId = listing.seller?._id || listing.seller
  const isOwner = sellerId === user.id
  if (!isOwner && user.role !== 'admin') {
    return (
      <section className="mx-auto max-w-lg px-6 py-8">
        <BackButton fallback="/my-listings" className="mb-4" />
        <p className="text-destructive">This isn't your listing to edit.</p>
      </section>
    )
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

  const handleSubmit = async (form, images) => {
    setSubmitError('')
    setSubmitting(true)
    try {
      await updateListing(id, form, images)
      navigate('/my-listings')
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not update listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg px-6 py-8">
      <BackButton fallback="/my-listings" className="mb-4" />
      <h1 className="mb-2 text-2xl font-bold text-foreground">Edit listing</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Changing price, brand, model, year, mileage, fuel type, or transmission will re-run the AI scoring pipeline automatically. Uploading new photos replaces all existing ones.
      </p>
      <ListingForm
        initialValues={initialValues}
        existingImages={listing.images ?? []}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={submitError}
        submitLabel="Save changes"
        submittingLabel="Saving and re-scoring..."
        showImages
      />
    </section>
  )
}
