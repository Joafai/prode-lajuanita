'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import LoadingScreen from '@/components/LoadingScreen'

export default function Header({ name }: { name: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [signingOut, setSigningOut] = useState(false)

  async function logout() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {signingOut && (
        <div className="fixed inset-0 z-999" style={{ background: '#F5EEE6' }}>
          <LoadingScreen />
        </div>
      )}

      <header
        style={{ background: '#88ABBE', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
        className="sticky top-0 z-50 px-6 h-[60px] flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo-white.png"
            alt="La Juanita"
            width={120}
            height={48}
            className="object-contain"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
          />
          <span className="font-outfit text-[11px] tracking-[3px] text-white/70 font-medium uppercase hidden sm:block">
            World Cup 2026
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-[13px] font-bold text-white">
            {name[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-white/80 hidden sm:block">{name}</span>
          <button
            onClick={logout}
            disabled={signingOut}
            style={{ border: '1px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.85)' }}
            className="text-xs px-3 py-1.5 rounded-full hover:border-white hover:text-white transition-all disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </header>
    </>
  )
}
