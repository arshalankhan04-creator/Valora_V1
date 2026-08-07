import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createListing } from '../services/listings'
import ListingForm from '../components/ListingForm'
import ListingRejectedModal from '../components/ListingRejectedModal'

export default function CreateListing() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [rejectionReasons, setRejectionReasons] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (form, images) => {
    setError('')
    setSubmitting(true)

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => formData.append(key, value))
    images.forEach((file) => formData.append('images', file))

    try {
      const listing = await createListing(formData)
      navigate(`/listings/${listing._id}`)
    } catch (err) {
      // Step 4's hard rejections carry a `reasons` list — show those in a
      // dedicated modal instead of a single generic error line.
      const reasons = err.response?.data?.reasons
      if (reasons?.length) {
        setRejectionReasons(reasons)
      } else {
        setError(err.response?.data?.message || 'Could not create listing')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-3xl mx-auto px-6 sm:px-10 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">List your car</h1>
      <ListingForm
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        submitLabel="Publish listing"
        submittingLabel="Analyzing listing (price, fraud, condition)..."
      />
      <ListingRejectedModal
        open={Boolean(rejectionReasons)}
        onOpenChange={(open) => !open && setRejectionReasons(null)}
        reasons={rejectionReasons ?? []}
      />
    </section>
  )
}
