import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createListing } from '../services/listings'
import ListingForm from '../components/ListingForm'

export default function CreateListing() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
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
      setError(err.response?.data?.message || 'Could not create listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">List your car</h1>
      <ListingForm
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        submitLabel="Publish listing"
        submittingLabel="Analyzing listing (price, fraud, condition)..."
      />
    </section>
  )
}
