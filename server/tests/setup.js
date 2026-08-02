import { config } from 'dotenv'
config({ path: '.env.test' })

import mongoose from 'mongoose'
import { beforeAll, afterEach, afterAll } from 'vitest'

beforeAll(async () => {
  if (!process.env.MONGODB_URI?.includes('_test')) {
    // Cheap safety net — a typo'd .env.test pointing at the dev database
    // would silently wipe real seed data in the afterEach hook below.
    throw new Error(
      `Refusing to run tests against "${process.env.MONGODB_URI}" — MONGODB_URI must point at a database with "_test" in its name.`,
    )
  }
  await mongoose.connect(process.env.MONGODB_URI)
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
})

afterAll(async () => {
  await mongoose.connection.close()
})
