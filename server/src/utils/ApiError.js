export default class ApiError extends Error {
  // reasons: optional list of specific, human-readable causes (e.g. why an
  // AI verification check rejected a listing) — the client uses this to
  // show a detailed modal instead of just the single-line `message`.
  constructor(statusCode, message, reasons = []) {
    super(message)
    this.statusCode = statusCode
    this.reasons = reasons
  }
}
