'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else router.push('/')
  }

  const input =
    'w-full border border-[#C9C2B2] bg-white px-3 py-2 text-sm text-[#1C2B3A] focus:outline-none focus:ring-2 focus:ring-[#9C7A29]'
  const label = 'block font-data text-xs uppercase tracking-wide text-[#52616F] mb-1'

  return (
    <main className="min-h-screen bg-[#F4F1EA] text-[#1C2B3A] px-4 py-16">
      <div className="max-w-sm mx-auto">
        <p className="font-data text-xs uppercase tracking-wide text-[#9C7A29] mb-1">Colorado Ceasefire</p>
        <h1 className="font-display text-2xl mb-6">Staff sign in</h1>

        <form onSubmit={handleSubmit} className="border border-[#C9C2B2] bg-white/40 p-6 space-y-4">
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </div>
          {error && <p className="text-sm text-[#8B3A3A]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full font-data text-xs uppercase tracking-wide px-4 py-2.5 bg-[#1C2B3A] text-white hover:bg-[#2c3f52] disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link href="/" className="inline-block mt-4 font-data text-xs uppercase tracking-wide text-[#52616F] hover:underline">
          ← Back to the bill list
        </Link>
      </div>
    </main>
  )
}
