// LegiScan stores bill status as a number. These are LegiScan's exact names.
export const STATUS_LABELS = {
  1: 'Introduced',
  2: 'Engrossed',
  3: 'Enrolled',
  4: 'Passed',
  5: 'Vetoed',
  6: 'Failed',
}

// The sections the watchlist is split into, in order. Every section except
// "In Committee" is a LegiScan status. "In Committee" uses LegiScan's
// current-committee field for bills that are Introduced or Engrossed.
export const STATUS_GROUPS = [
  { label: 'Passed', note: 'Signed into law or otherwise enacted' },
  { label: 'Enrolled', note: 'Passed both chambers, sent to the Governor' },
  { label: 'In Committee', note: 'Currently assigned to a committee' },
  { label: 'Engrossed', note: 'Passed its first chamber, awaiting action in the second' },
  { label: 'Introduced', note: 'Introduced, awaiting action in its first chamber' },
  { label: 'Vetoed', note: 'Vetoed by the Governor' },
  { label: 'Failed', note: 'Did not pass, including bills still pending when the session ended' },
  { label: 'Unknown', note: 'No status reported by LegiScan yet' },
]

// Statuses that mean a bill was still moving through the legislature
const STILL_MOVING = ['Introduced', 'Engrossed']

// Which watchlist section a bill belongs in.
//  - Introduced/Engrossed bills in a session that has adjourned -> Failed
//  - Introduced/Engrossed bills sitting in a committee -> In Committee
//  - everything else -> its LegiScan status
// (Enrolled bills stay Enrolled after adjournment, since the Governor can
//  still sign them.)
export function billStage(status, { sessionEnded, inCommittee }) {
  if (STILL_MOVING.includes(status)) {
    if (sessionEnded) return 'Failed'
    if (inCommittee) return 'In Committee'
  }
  return status
}

export function statusLabel(status) {
  if (status === null || status === undefined || status === '') return 'Unknown'
  return STATUS_LABELS[Number(status)] || String(status)
}

// Our organization's position on a watchlist bill
export const POSITIONS = [
  { value: 'support', label: 'Support', color: '#3F6B4F' },
  { value: 'neutral', label: 'Neutral', color: '#52616F' },
  { value: 'oppose', label: 'Oppose', color: '#8B3A3A' },
]

export function positionInfo(value) {
  return POSITIONS.find((p) => p.value === value) || null
}

// The year a bill belongs to. Uses the legislative session name first
// (e.g. "2026 Regular Session" -> 2026), then falls back to the last action date.
export function billYear(bill) {
  const fromSession = String(bill.session_name || '').match(/\b(19|20)\d{2}\b/)
  if (fromSession) return Number(fromSession[0])
  if (bill.last_action_date) return Number(String(bill.last_action_date).slice(0, 4))
  return null
}

// LegiScan sends some text with HTML codes (e.g. "&amp;" instead of "&").
// This turns them back into normal characters.
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeText(text) {
  if (!text) return text
  let out = String(text)
  // Run twice to handle double-encoded text like "&amp;amp;"
  for (let i = 0; i < 2; i++) {
    out = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
      if (code[0] === '#') {
        const num = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(num) ? String.fromCodePoint(num) : match
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match
    })
  }
  return out
}
