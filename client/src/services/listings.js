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

export function getAdminListings(status) {
  return api
    .get('/listings/admin', { params: status ? { status } : {} })
    .then((res) => res.data.listings)
}

export function updateListingStatus(id, status) {
  return api.patch(`/listings/${id}`, { status }).then((res) => res.data.listing)
}

export function deleteListing(id) {
  return api.delete(`/listings/${id}`)
}
