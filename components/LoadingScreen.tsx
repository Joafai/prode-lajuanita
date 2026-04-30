'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const IMAGES = [
  '/juanita-goal.png',
  '/juanita-trophy.png',
  '/juanita-kick.png',
  '/juanita-flag.png',
  '/juanita-empanada-flag.png',
  '/juanita-empanada-scarf.png',
]

const LETTERS = ['L', 'O', 'A', 'D', 'I', 'N', 'G']

export default function LoadingScreen() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % IMAGES.length)
        setVisible(true)
      }, 100)
    }, 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{ background: '#F5EEE6', minHeight: '80vh' }}
      className="flex flex-col items-center justify-center gap-6 relative z-10"
    >
      <div
        style={{
          width: 220,
          height: 220,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          mixBlendMode: 'multiply',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <Image src={IMAGES[idx]} alt="" width={220} height={220} priority style={{ mixBlendMode: 'multiply' }} />
      </div>

      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end' }}>
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            style={{
              fontFamily: 'var(--font-bebas-neue), sans-serif',
              fontSize: '32px',
              letterSpacing: '2px',
              color: '#B8924A',
              display: 'inline-block',
              animation: `letterBounce 1.4s ease-in-out ${i * 0.1}s infinite`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  )
}
