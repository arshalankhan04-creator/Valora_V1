import api from './api'

export function getListings(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  )
  return api.get('/listings', { params }).then((res) => res.data.listings)
}

export function getListing(id) {
  return api.get(`/listings/${id}`).then((res) => res.data.listing)
}

export function createListing(formData) {
  return api
    .post('/listings', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data.listing)
}
