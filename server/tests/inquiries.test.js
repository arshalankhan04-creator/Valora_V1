import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/services/mlService.js', () => ({
  predictPrice: vi.fn().mockResolvedValue({
    predicted_price_min: 500000,
    predicted_price_max: 600000,
    confidence_level: 'high',
    feature_importance: {},
  }),
  detectFraud: vi.fn().mockResolvedValue({ risk_flag: 'Low', fraud_probability: 0.1, reasons: [] }),
  assessCondition: vi.fn(),
  getTrustScore: vi.fn().mockResolvedValue({
    trust_score: 90,
    breakdown: { price_fairness: 38, fraud_risk: 27, condition_match: 24, seller_factor: 1 },
  }),
}))

vi.mock('../src/services/emailService.js', () => ({
  sendMail: vi.fn().mockResolvedValue(),
}))

const emailService = await import('../src/services/emailService.js')
const { default: app } = await import('../src/app.js')

async function registerUser(role) {
  const email = `${role}-${Math.random().toString(36).slice(2)}@valora.test`
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `Test ${role}`, email, password: 'password123', role })
  return { token: res.body.token, user: res.body.user }
}

async function createListing(sellerToken) {
  const res = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${sellerToken}`)
    .field({
      brand: 'Honda',
      model: 'City',
      year: 2021,
      kmDriven: 32000,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      price: 1500000,
    })
  return res.body.listing._id
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/inquiries', () => {
  it('emails the seller with the buyer message', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)

    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Is this still available?' })

    expect(res.status).toBe(201)
    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: seller.user.email,
        text: expect.stringContaining('Is this still available?'),
      }),
    )
  })

  it('reuses the existing thread instead of creating a duplicate', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)

    const first = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'First message' })
    const second = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Second message' })

    expect(second.body.inquiry._id).toBe(first.body.inquiry._id)
    expect(second.body.inquiry.messages).toHaveLength(2)
  })

  it('still returns 201 even if the email send fails', async () => {
    emailService.sendMail.mockRejectedValue(new Error('SMTP down'))
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)

    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Hello' })

    expect(res.status).toBe(201)
  })
})

describe('POST /api/inquiries/:id/messages', () => {
  async function startInquiry(sellerToken, buyerToken, listingId) {
    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId, text: 'Opening message' })
    return res.body.inquiry._id
  }

  it('notifies the seller when the buyer replies', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const inquiryId = await startInquiry(seller.token, buyer.token, listingId)
    vi.clearAllMocks()

    await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ text: 'Following up' })

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: seller.user.email }),
    )
  })

  it('notifies the buyer when the seller replies', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const inquiryId = await startInquiry(seller.token, buyer.token, listingId)
    vi.clearAllMocks()

    await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ text: 'Yes, still available' })

    expect(emailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: buyer.user.email }),
    )
  })

  it('rejects a reply from someone not part of the conversation', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const stranger = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const inquiryId = await startInquiry(seller.token, buyer.token, listingId)

    const res = await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ text: 'Butting in' })

    expect(res.status).toBe(403)
  })
})

async function getInquiry(token, inquiryId) {
  const res = await request(app).get('/api/inquiries').set('Authorization', `Bearer ${token}`)
  return res.body.inquiries.find((i) => i._id === inquiryId)
}

describe('GET /api/inquiries — archived/unread derivation', () => {
  it('is unread for the seller and read for the buyer right after the opening message', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })
    const inquiryId = created.body.inquiry._id

    const forBuyer = await getInquiry(buyer.token, inquiryId)
    const forSeller = await getInquiry(seller.token, inquiryId)

    expect(forBuyer.unread).toBe(false)
    expect(forSeller.unread).toBe(true)
    expect(forBuyer.archived).toBe(false)
    expect(forSeller.archived).toBe(false)
    // Neither party's raw per-side fields should ever reach the client.
    expect(forBuyer.buyerLastReadAt).toBeUndefined()
    expect(forBuyer.sellerArchived).toBeUndefined()
  })

  it('flips unread once a reply is sent, and back for the replier', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })
    const inquiryId = created.body.inquiry._id

    await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ text: 'Yes, available' })

    expect((await getInquiry(seller.token, inquiryId)).unread).toBe(false)
    expect((await getInquiry(buyer.token, inquiryId)).unread).toBe(true)
  })
})

describe('PATCH /api/inquiries/:id/read', () => {
  it('marks the thread read for the caller only', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })
    const inquiryId = created.body.inquiry._id

    const res = await request(app)
      .patch(`/api/inquiries/${inquiryId}/read`)
      .set('Authorization', `Bearer ${seller.token}`)

    expect(res.status).toBe(204)
    expect((await getInquiry(seller.token, inquiryId)).unread).toBe(false)
  })

  it('rejects a caller who is not part of the conversation', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const stranger = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })

    const res = await request(app)
      .patch(`/api/inquiries/${created.body.inquiry._id}/read`)
      .set('Authorization', `Bearer ${stranger.token}`)

    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/inquiries/:id/archive', () => {
  it('archives the thread for the caller without affecting the other party', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })
    const inquiryId = created.body.inquiry._id

    const res = await request(app)
      .patch(`/api/inquiries/${inquiryId}/archive`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ archived: true })

    expect(res.status).toBe(204)
    expect((await getInquiry(buyer.token, inquiryId)).archived).toBe(true)
    expect((await getInquiry(seller.token, inquiryId)).archived).toBe(false)
  })

  it('can be reversed by sending archived: false', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })
    const inquiryId = created.body.inquiry._id
    await request(app)
      .patch(`/api/inquiries/${inquiryId}/archive`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ archived: true })

    await request(app)
      .patch(`/api/inquiries/${inquiryId}/archive`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ archived: false })

    expect((await getInquiry(buyer.token, inquiryId)).archived).toBe(false)
  })

  it('rejects a non-boolean archived value', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })

    const res = await request(app)
      .patch(`/api/inquiries/${created.body.inquiry._id}/archive`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ archived: 'yes' })

    expect(res.status).toBe(400)
  })

  it('rejects a caller who is not part of the conversation', async () => {
    const seller = await registerUser('seller')
    const buyer = await registerUser('buyer')
    const stranger = await registerUser('buyer')
    const listingId = await createListing(seller.token)
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ listingId, text: 'Opening message' })

    const res = await request(app)
      .patch(`/api/inquiries/${created.body.inquiry._id}/archive`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ archived: true })

    expect(res.status).toBe(403)
  })
})
