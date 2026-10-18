'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import BillCard from '../components/BillCard'
import FilterPanel from '../components/FilterPanel'
import { categorizeBill } from '../lib/categorizeBill'
import { statusLabel, billYear, decodeText, billStage, STATUS_GROUPS } from '../lib/billInfo'

const EMPTY_FILTERS = { search: '', year: 'all', categories: [], statuses: [], positions: [] }

const TABS = [
  { value: 'pending', label: 'To Review' },
  { value: 'watch', label: 'Watchlist' },
  { value: 'archived', label: 'Not Watching' },
]

function reshape(bill, sessions = {}) {
  const autoCategory = categorizeBill(bill.matched_keywords || [])
  const status = statusLabel(bill.status)
  const session = sessions.byId?.[bill.session_id] || sessions.byName?.[bill.session_name]
  const sessionEnded = Boolean(session?.sine_die)
  const stage = billStage(status, { sessionEnded, inCommittee: bill.in_committee })
  return {
    id: bill.id,
    billNumber: bill.bill_number,
    title: decodeText(bill.title),
    description: decodeText(bill.description),
    status,
    stage,
    diedAtSessionEnd: stage === 'Failed' && status !== 'Failed',
    committeeName: bill.committee_name,
    lastAction: decodeText(bill.last_action),
    lastActionDate: bill.last_action_date,
    url: bill.url,
    year: billYear(bill),
    autoCategory,
    manualCategory: bill.manual_category,
    category: bill.manual_category || autoCategory,
    watchlistStatus: bill.watchlist_status || 'pending',
    position: bill.position,
    plainSummary: bill.plain_summary,
    benefits: bill.benefits,
    risks: bill.risks,
    lastEditedBy: bill.last_edited_by,
    lastEditedAt: bill.last_edited_at,
  }
}

// Website field names -> database column names
const DB_COLUMNS = {
  watchlistStatus: 'watchlist_status',
  position: 'position',
  manualCategory: 'manual_category',
  plainSummary: 'plain_summary',
  benefits: 'benefits',
  risks: 'risks',
}

export default function Home() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [tab, setTab] = useState('pending')
  const [sessions, setSessions] = useState({})

  const isStaff = Boolean(session)

  // Keep track of whether someone is signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Load bills. The database decides what each person may see:
  // the public gets watchlist bills only, staff get everything.
  const fetchBills = useCallback(async () => {
    setLoading(true)
    const [billsResult, sessionsResult] = await Promise.all([
      supabase
        .from('bills')
        .select('*')
        .eq('state', 'CO')
        .order('last_action_date', { ascending: false, nullsFirst: false }),
      supabase.from('sessions').select('session_id, session_name, sine_die').eq('state', 'CO'),
    ])

    // Session info is a nice-to-have: if it can't load, bills still show
    const sessionRows = sessionsResult.error ? [] : sessionsResult.data
    const sessionMaps = {
      byId: Object.fromEntries(sessionRows.map((r) => [r.session_id, r])),
      byName: Object.fromEntries(sessionRows.map((r) => [r.session_name, r])),
    }
    setSessions(sessionMaps)

    if (billsResult.error) setError(billsResult.error.message)
    else {
      setError(null)
      setBills(billsResult.data.map((b) => reshape(b, sessionMaps)))
    }
    setLoading(false)
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (authReady) fetchBills()
  }, [authReady, userId, fetchBills])

  // Save a change to one bill (staff only). Updates the screen right away,
  // and puts things back if the save fails.
  const updateBill = useCallback(async (id, changes) => {
    let previous
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        previous = b
        const next = { ...b, ...changes }
        next.category = next.manualCategory || next.autoCategory
        return next
      })
    )

    const dbChanges = {}
    for (const [key, value] of Object.entries(changes)) {
      dbChanges[DB_COLUMNS[key]] = value === '' ? null : value
    }

    const { data, error } = await supabase.from('bills').update(dbChanges).eq('id', id).select()

    if (error || !data?.length) {
      setBills((prev) => prev.map((b) => (b.id === id && previous ? previous : b)))
      alert(`Could not save: ${error?.message || 'permission denied'}`)
      return false
    }
    setBills((prev) => prev.map((b) => (b.id === id ? reshape(data[0], sessions) : b)))
    return true
  }, [sessions])

  async function signOut() {
    await supabase.auth.signOut()
    setTab('pending')
    setFilters(EMPTY_FILTERS)
  }

  // Which list is showing: the public always sees the watchlist
  const activeTab = isStaff ? tab : 'watch'
  const tabBills = useMemo(() => bills.filter((b) => b.watchlistStatus === activeTab), [bills, activeTab])
  const counts = useMemo(
    () =>
      bills.reduce((acc, b) => {
        acc[b.watchlistStatus] = (acc[b.watchlistStatus] || 0) + 1
        return acc
      }, {}),
    [bills]
  )

  const years = useMemo(
    () => [...new Set(tabBills.map((b) => b.year).filter(Boolean))].sort((a, b) => b - a),
    [tabBills]
  )
  const statuses = useMemo(() => {
    const present = new Set(tabBills.map((b) => b.stage))
    return STATUS_GROUPS.map((g) => g.label).filter((label) => present.has(label))
  }, [tabBills])

  const filteredBills = tabBills.filter((bill) => {
    if (filters.year !== 'all' && bill.year !== filters.year) return false
    if (filters.categories.length && !filters.categories.includes(bill.category)) return false
    if (filters.statuses.length && !filters.statuses.includes(bill.stage)) return false
    if (activeTab === 'watch' && filters.positions.length && !filters.positions.includes(bill.position || 'none'))
      return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const text = `${bill.billNumber} ${bill.title} ${bill.description || ''} ${bill.plainSummary || ''}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })

  let emptyMessage = 'No bills match these filters.'
  if (tabBills.length === 0) {
    if (activeTab === 'pending') emptyMessage = 'Nothing left to review.'
    else if (activeTab === 'watch') emptyMessage = 'No bills on the watchlist yet.'
    else emptyMessage = 'No bills here.'
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] text-[#1C2B3A] px-4 py-8 md:px-10 md:py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 border-b border-[#C9C2B2] pb-5">
          <div className="flex items-start justify-between gap-4">
            <p className="font-data text-xs uppercase tracking-wide text-[#9C7A29] mb-1">
              Colorado Ceasefire
            </p>
            {authReady &&
              (isStaff ? (
                <div className="text-right font-data text-xs text-[#52616F]">
                  {session.user.email} ·{' '}
                  <button onClick={signOut} className="uppercase tracking-wide text-[#8B3A3A] hover:underline">
                    Sign out
                  </button>
                </div>
              ) : (
                <Link href="/login" className="font-data text-xs uppercase tracking-wide text-[#52616F] hover:underline">
                  Staff sign in
                </Link>
              ))}
          </div>
          <h1 className="font-display text-3xl text-[#1C2B3A]">Colorado Firearm Legislation</h1>
          <p className="text-sm text-[#52616F] mt-2">
            {isStaff
              ? 'Review new bills, build the watchlist, and record our positions.'
              : 'Firearm-related bills in the Colorado General Assembly that we are watching, and where we stand.'}
          </p>
        </header>

        {isStaff && (
          <nav className="flex flex-wrap gap-2 mb-6">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTab(t.value)
                  setFilters(EMPTY_FILTERS)
                }}
                className={`font-data text-xs uppercase tracking-wide px-4 py-2 border transition-colors ${
                  tab === t.value
                    ? 'bg-[#1C2B3A] text-white border-[#1C2B3A]'
                    : 'bg-white text-[#1C2B3A] border-[#C9C2B2] hover:border-[#1C2B3A]'
                }`}
              >
                {t.label} ({counts[t.value] || 0})
              </button>
            ))}
          </nav>
        )}

        {loading && <p className="text-[#52616F]">Loading bills...</p>}
        {error && <p className="text-[#8B3A3A]">Error: {error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                emptyFilters={EMPTY_FILTERS}
                years={years}
                statuses={statuses}
                showPositions={activeTab === 'watch'}
              />
            </div>
            <div className="md:col-span-3 space-y-4">
              <p className="font-data text-xs uppercase tracking-wide text-[#52616F]">
                {filters.year === 'all' ? 'All years' : filters.year} — {filteredBills.length}{' '}
                {filteredBills.length === 1 ? 'bill' : 'bills'}
              </p>
              {filteredBills.length === 0 && <p className="text-sm text-[#52616F]">{emptyMessage}</p>}
              {activeTab === 'watch'
                ? STATUS_GROUPS.map((group) => {
                    const groupBills = filteredBills.filter((b) => b.stage === group.label)
                    if (groupBills.length === 0) return null
                    return (
                      <section key={group.label} className="pt-4 first:pt-0">
                        <div className="flex items-baseline justify-between gap-4 border-b-2 border-[#1C2B3A] pb-2 mb-4">
                          <h2 className="font-display text-xl text-[#1C2B3A]">
                            {group.label}{' '}
                            <span className="font-data text-sm text-[#52616F]">({groupBills.length})</span>
                          </h2>
                          <p className="font-data text-xs text-[#52616F] text-right">{group.note}</p>
                        </div>
                        <div className="space-y-4">
                          {groupBills.map((bill) => (
                            <BillCard key={bill.id} bill={bill} isStaff={isStaff} onUpdate={updateBill} />
                          ))}
                        </div>
                      </section>
                    )
                  })
                : filteredBills.map((bill) => (
                    <BillCard key={bill.id} bill={bill} isStaff={isStaff} onUpdate={updateBill} />
                  ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
