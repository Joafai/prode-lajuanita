'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function AuthForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Please enter your email'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name: name || email.split('@')[0] },
      },
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      className="rounded-[18px] p-10 w-full max-w-sm"
    >
      <div className="flex justify-center mb-2">
        <Image src="/logo-black.png" alt="La Juanita" width={160} height={64} className="object-contain" />
      </div>
      <div className="text-center text-muted text-sm mb-8">World Cup 2026 Predictions</div>

      {sent ? (
        <div className="text-center">
          <div className="text-4xl mb-4">📬</div>
          <p className="text-text font-semibold mb-2">Check your email!</p>
          <p className="text-muted text-sm leading-relaxed">
            We sent an access link to <strong className="text-muted2">{email}</strong>.
            Click the link to join the predictions.
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); setName('') }}
            className="mt-6 text-xs text-muted hover:text-gold transition-colors"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Name <span className="normal-case font-normal">(first time only)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or nickname"
              maxLength={30}
              style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
            />
          </div>

          {error && (
            <div
              style={{ background: 'rgba(212,64,64,0.08)', border: '1px solid rgba(212,64,64,0.25)' }}
              className="rounded-lg px-3.5 py-2.5 text-danger text-sm"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm mt-1"
          >
            {loading ? 'Sending...' : 'Get my access link →'}
          </button>

          <p className="text-xs text-center text-muted">
            No password — we&apos;ll send a direct link to your email.
          </p>
        </form>
      )}
    </div>
  )
}
