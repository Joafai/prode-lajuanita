'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const STORAGE_KEY = 'juanita-intro-seen'

export default function IntroOverlay() {
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY)) return
    sessionStorage.setItem(STORAGE_KEY, '1')
    setShow(true)
  }, [])

  useEffect(() => {
    if (!show) return
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }, [show])

  function dismiss() {
    if (closing) return
    setClosing(true)
    setTimeout(() => setShow(false), 500)
  }

  if (!show) return null

  return (
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-500 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#1C2B38' }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/juanita-stadium-bg.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(28,43,56,0.45) 0%, rgba(28,43,56,0.75) 100%)' }}
      />

      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        aria-label="Skip intro"
        className="absolute top-5 right-5 w-9 h-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-xl z-10"
      >
        ×
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex flex-col items-center gap-6 max-w-2xl w-full"
      >
        <div className="w-full max-w-xs flex flex-col items-center">
          <div
            style={{ animation: 'logoEntrance 900ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
            className="w-full"
          >
            <div style={{ animation: 'logoFloat 3.6s ease-in-out 900ms infinite' }}>
              <Image
                src="/logo-white.png"
                alt="La Juanita"
                width={763}
                height={476}
                priority
                className="w-full h-auto"
              />
            </div>
          </div>
          <p className="-mt-8 text-white/80 text-xs md:text-sm tracking-wide uppercase">
            World Cup 2026 Predictions game
          </p>
        </div>

        <button
          onClick={dismiss}
          className="px-8 py-3.5 bg-gold text-white font-bold rounded-lg hover:bg-gold2 transition-colors text-sm tracking-wide shadow-lg"
        >
          Enter →
        </button>
      </div>
    </div>
  )
}
