import rateLimit from 'express-rate-limit'

// Blunts brute-force/credential-stuffing on login and registration-spam on
// register. Skipped entirely under NODE_ENV=test — auth.test.js alone fires
// more requests than any reasonable limit in a few seconds, and these tests
// aren't about rate-limit behavior (see tests/setup.js for the same
// test-env carve-out pattern already used for morgan logging in app.js).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
})
