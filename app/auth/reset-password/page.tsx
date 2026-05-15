'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'verifying' | 'ready' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function verify() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setStatus('ready'); return }
      setError('No hay sesión activa. Pedí un nuevo link desde "Olvidé mi contraseña".')
      setStatus('invalid')
    }

    verify()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) { setError(err.message); return }
    setStatus('success')
    setTimeout(() => window.location.replace('/dashboard'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5EEE6' }}>
      <div
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        className="rounded-[18px] p-10 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <p className="font-bebas text-2xl tracking-widest text-gold">Nueva contraseña</p>
        </div>

        {status === 'verifying' && (
          <div className="text-center text-sm text-muted">Verificando...</div>
        )}

        {status === 'invalid' && (
          <div className="text-center space-y-3">
            <div className="text-3xl">⚠️</div>
            <p className="text-sm text-danger">{error}</p>
            <a href="/" className="inline-block text-xs text-muted hover:text-gold transition-colors underline">
              Volver al inicio
            </a>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-3">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-medium text-text">Contraseña actualizada</p>
            <p className="text-xs text-muted">Redirigiendo...</p>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                minLength={6}
                style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(212,64,64,0.08)', border: '1px solid rgba(212,64,64,0.25)' }} className="rounded-lg px-3.5 py-2.5 text-danger text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm mt-1"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
