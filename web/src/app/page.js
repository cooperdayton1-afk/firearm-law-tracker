'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BillCard from '../components/BillCard'
import FilterPanel from '../components/FilterPanel'
import { categorizeBill } from '../lib/categorizeBill'
import { statusLabel, billYear } from '../lib/billInfo'

const EMPTY_FILTERS = { search: '', year: 'all', categories: [], statuses: [] }

export default function Home() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  useEffect(() => {
    async function fetchBills() {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('state', 'CO')
        .order('last_action_date', { ascending: false, nullsFirst: false })

      if (error) {
        setError(error.message)
      } else {
        const reshaped = data.map((bill) => ({
          id: bill.id,
          billNumber: bill.bill_number,
          title: bill.title,
          description: bill.description,
          status: statusLabel(bill.status),
          lastAction: bill.last_action,
          lastActionDate: bill.last_action_date,
          url: bill.url,
          year: billYear(bill),
          category: categorizeBill(bill.matched_keywords || []),
        }))
        setBills(reshaped)
      }
      setLoading(false)
    }

    fetchBills()
  }, [])

  // Years and statuses that actually appear in the data, for the filter options
  const years = useMemo(
    () => [...new Set(bills.map((b) => b.year).filter(Boolean))].sort((a, b) => b - a),
    [bills]
  )
  const statuses = useMemo(() => [...new Set(bills.map((b) => b.status))].sort(), [bills])

  const filteredBills = bills.filter((bill) => {
    if (filters.year !== 'all' && bill.year !== filters.year) return false
    if (filters.categories.length && !filters.categories.includes(bill.category)) return false
    if (filters.statuses.length && !filters.statuses.includes(bill.status)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const text = `${bill.billNumber} ${bill.title} ${bill.description || ''}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })

  return (
    <main className="min-h-screen bg-[#F4F1EA] text-[#1C2B3A] px-4 py-8 md:px-10 md:py-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-[#C9C2B2] pb-5">
          <p className="font-data text-xs uppercase tracking-wide text-[#9C7A29] mb-1">
            Colorado Ceasefire
          </p>
          <h1 className="font-display text-3xl text-[#1C2B3A]">Colorado Firearm Legislation</h1>
          <p className="text-sm text-[#52616F] mt-2">
            A running list of firearm-related bills in the Colorado General Assembly, updated daily.
          </p>
        </header>

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
              />
            </div>
            <div className="md:col-span-3 space-y-4">
              <p className="font-data text-xs uppercase tracking-wide text-[#52616F]">
                {filters.year === 'all' ? 'All years' : filters.year} — {filteredBills.length}{' '}
                {filteredBills.length === 1 ? 'bill' : 'bills'}
              </p>
              {filteredBills.length === 0 && (
                <p className="text-sm text-[#52616F]">No bills match these filters.</p>
              )}
              {filteredBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
