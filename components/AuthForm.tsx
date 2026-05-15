'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function resetState() {
    setError('')
    setInfo('')
    setPassword('')
  }

  function switchMode(next: Mode) {
    resetState()
    setMode(next)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    resetState()
    if (!email || !password) { setError('Completá email y contraseña'); return }
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (err) {
      if (err.message.toLowerCase().includes('email not confirmed')) {
        setError('Confirmá tu email antes de iniciar sesión. Revisá tu casilla.')
      } else if (err.message.toLowerCase().includes('invalid login')) {
        setError('Email o contraseña incorrectos. Si te registraste con magic link antes, usá "Olvidé mi contraseña" abajo.')
      } else {
        setError(err.message)
      }
      return
    }

    window.location.replace('/dashboard')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    resetState()
    if (!email || !password) { setError('Completá email y contraseña'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: { name: name || email.split('@')[0] },
      },
    })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setInfo('¡Listo! Te mandamos un email para confirmar tu cuenta. Revisá tu casilla.')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    resetState()
    if (!email) { setError('Ingresá tu email'); return }
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setInfo('Te mandamos un email con un link para crear/restablecer tu contraseña.')
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

      {mode !== 'forgot' && (
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: '#ECE6DC' }}>
          {(['login', 'register'] as const).map((m) => {
            const active = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={
                  active
                    ? { background: '#FFFFFF', color: '#1C2B38', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { background: 'transparent', color: '#7A8E9B' }
                }
                className="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            )
          })}
        </div>
      )}

      {info && (
        <div
          style={{ background: 'rgba(45,170,94,0.08)', border: '1px solid rgba(45,170,94,0.3)' }}
          className="rounded-lg px-3.5 py-3 text-green text-sm mb-4"
        >
          {info}
        </div>
      )}

      {mode === 'forgot' ? (
        <form onSubmit={handleForgot} className="space-y-4">
          <div className="text-center mb-2">
            <p className="font-semibold text-text">Recuperar contraseña</p>
            <p className="text-muted text-xs mt-1">
              Te mandamos un email con un link para crear una nueva.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
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
            {loading ? 'Enviando...' : 'Enviar link →'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full text-xs text-muted hover:text-gold transition-colors"
          >
            ← Volver a iniciar sesión
          </button>
        </form>
      ) : mode === 'register' ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre o apodo"
              maxLength={30}
              style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Contraseña</label>
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
          </button>

          <p className="text-xs text-center text-muted">
            Vas a recibir un email para confirmar tu cuenta.
          </p>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{ background: '#ECE6DC', border: '1px solid rgba(0,0,0,0.1)', color: '#1C2B38' }}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-gold transition-colors placeholder:text-muted"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
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
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión →'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('forgot')}
            className="w-full text-xs text-muted hover:text-gold transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      )}
    </div>
  )
}
