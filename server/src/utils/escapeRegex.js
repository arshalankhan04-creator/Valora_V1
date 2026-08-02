// Escapes regex special characters so user input can be used safely inside
// a RegExp — without this, a search for "C++" would throw, and untrusted
// input could be crafted into a catastrophic-backtracking pattern.
export default function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
