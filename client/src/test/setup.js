import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no IntersectionObserver — needed by Framer Motion's
// `whileInView` (used across the landing page sections). A real
// intersection check is unnecessary in tests; treating everything as
// immediately in-view keeps whileInView animations from throwing.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = MockIntersectionObserver

afterEach(() => {
  cleanup()
  localStorage.clear()
})
