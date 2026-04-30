'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()

    async function handleAuth() {
      // 1. Implicit flow: tokens en el hash (#access_token=...)
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            window.location.replace('/dashboard')
            return
          }
        }
      }

      // 2. PKCE flow: code en query params (?code=...)
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          window.location.replace('/dashboard')
          return
        }
      }

      // 3. Sesión ya existente
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.replace('/dashboard')
        return
      }

      // Sin sesión válida → login
      window.location.replace('/')
    }

    handleAuth()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EEE6' }}>
      <div className="text-center space-y-3">
        <div className="text-3xl">🔐</div>
        <p className="text-sm font-medium" style={{ color: '#1C2B38' }}>Ingresando...</p>
      </div>
    </div>
  )
}
