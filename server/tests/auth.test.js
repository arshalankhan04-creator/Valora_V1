import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

const VALID_USER = { name: 'Test User', email: 'test@valora.test', password: 'password123' }

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER)

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ name: VALID_USER.name, email: VALID_USER.email, role: 'buyer' })
    expect(res.body.user.password).toBeUndefined()
    expect(typeof res.body.token).toBe('string')
  })

  it('defaults role to buyer for an invalid role value', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, role: 'admin' }) // can't self-assign admin

    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('buyer')
  })

  it('accepts a valid seller role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, role: 'seller' })

    expect(res.body.user.role).toBe('seller')
  })

  it('rejects a missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: VALID_USER.name, email: VALID_USER.email })

    expect(res.status).toBe(400)
  })

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER)
    const res = await request(app).post('/api/auth/register').send(VALID_USER)

    expect(res.status).toBe(409)
  })

  it('rejects a NoSQL-injection-style object instead of a string field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: { $ne: null }, password: 'password123' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(VALID_USER.email)
  })

  it('rejects the wrong password', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'wrong-password' })

    expect(res.status).toBe(401)
  })

  it('rejects a nonexistent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@valora.test', password: 'whatever123' })

    expect(res.status).toBe(401)
  })

  it('rejects a NoSQL-injection-style object instead of a string credential', async () => {
    // A raw JSON body of {"email": {"$ne": null}} is a real payload a
    // client can send. Without a type check, User.findOne({ email })
    // would pass { $ne: null } straight through as a Mongo query operator
    // and match the first user in the collection — an auth bypass.
    await request(app).post('/api/auth/register').send(VALID_USER)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const { body } = await request(app).post('/api/auth/register').send(VALID_USER)
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(VALID_USER.email)
  })

  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })
})
