// LegiScan stores bill status as a number. These are the plain-English labels.
export const STATUS_LABELS = {
  1: 'Introduced',
  2: 'Passed One Chamber',
  3: 'Passed Legislature',
  4: 'Signed into Law',
  5: 'Vetoed',
  6: 'Failed',
}

export function statusLabel(status) {
  if (status === null || status === undefined || status === '') return 'Unknown'
  return STATUS_LABELS[Number(status)] || String(status)
}

// The year a bill belongs to. Uses the legislative session name first
// (e.g. "2026 Regular Session" -> 2026), then falls back to the last action date.
export function billYear(bill) {
  const fromSession = String(bill.session_name || '').match(/\b(19|20)\d{2}\b/)
  if (fromSession) return Number(fromSession[0])
  if (bill.last_action_date) return Number(String(bill.last_action_date).slice(0, 4))
  return null
}
