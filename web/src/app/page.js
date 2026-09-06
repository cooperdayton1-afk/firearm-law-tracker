'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import USMap from '../components/USMap'
import BillCard from '../components/BillCard'
import FilterPanel from '../components/FilterPanel'
import { categorizeBill } from '../lib/categorizeBill'

export default function Home() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedState, setSelectedState] = useState(null)
  const [filters, setFilters] = useState({ search: '', categories: [], statuses: [] })

  useEffect(() => {
    async function fetchBills() {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('last_action_date', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        // reshape raw Supabase rows into the shape BillCard/FilterPanel expect
        const reshaped = data.map((bill) => ({
          id: bill.id,
          state: bill.state,
          billNumber: bill.bill_number,
          title: bill.title,
          description: bill.description,
          status: bill.status,
          lastActionDate: bill.last_action_date,
          category: categorizeBill(bill.matched_keywords),
        }))
        setBills(reshaped)
      }
      setLoading(false)
    }

    fetchBills()
  }, [])

  if (loading) return <main style={{ padding: 40 }}>Loading bills...</main>
  if (error) return <main style={{ padding: 40 }}>Error: {error}</main>

  const billCounts = bills.reduce((acc, bill) => {
    acc[bill.state] = (acc[bill.state] || 0) + 1
    return acc
  }, {})

  const filteredBills = bills.filter((bill) => {
    if (selectedState && bill.state !== selectedState) return false
    if (filters.categories.length && !filters.categories.includes(bill.category)) return false
    if (filters.statuses.length && !filters.statuses.includes(bill.status)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const matchesSearch =
        bill.billNumber.toLowerCase().includes(q) || bill.title.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    return true
  })

  return (
    <main style={{ padding: 40 }}>
      <h1 className="font-display text-2xl text-[#1C2B3A] mb-4">Firearm Law Tracker</h1>

      <USMap
        billCounts={billCounts}
        selectedState={selectedState}
        onSelectState={setSelectedState}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="md:col-span-1">
          <FilterPanel filters={filters} setFilters={setFilters} />
        </div>
        <div className="md:col-span-3 space-y-4">
          <p className="font-data text-xs uppercase tracking-wide text-[#52616F]">
            {selectedState ? `${selectedState} — ` : 'All states — '}
            {filteredBills.length} bills
          </p>
          {filteredBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      </div>
    </main>
  )
}