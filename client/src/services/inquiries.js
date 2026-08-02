import api from './api'

export function getMyInquiries() {
  return api.get('/inquiries').then((res) => res.data.inquiries)
}

export function createInquiry(listingId, text) {
  return api.post('/inquiries', { listingId, text }).then((res) => res.data.inquiry)
}

export function addMessage(inquiryId, text) {
  return api.post(`/inquiries/${inquiryId}/messages`, { text }).then((res) => res.data.inquiry)
}
