import api from './api'

export function getWishlist() {
  return api.get('/users/me/wishlist').then((res) => res.data.listings)
}

export function addToWishlist(listingId) {
  return api.post(`/users/me/wishlist/${listingId}`)
}

export function removeFromWishlist(listingId) {
  return api.delete(`/users/me/wishlist/${listingId}`)
}
