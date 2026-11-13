// Server-side Meta Conversions API is not implemented.
// A later server call should send the same event_id the browser pixel used
// so Meta can dedupe the two. Do not call this from the quote page.

export function conversionsApiStatus(): { enabled: false; reason: "not_configured" } {
  return { enabled: false, reason: "not_configured" };
}
