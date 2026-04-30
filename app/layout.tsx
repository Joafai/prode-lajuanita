import type { Metadata } from 'next'
import { Bebas_Neue, Outfit } from 'next/font/google'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit-var',
})

export const metadata: Metadata = {
  title: 'Prode La Juanita · Mundial 2026',
  description: 'Participá del prode del Mundial 2026 de La Juanita',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bebasNeue.variable} ${outfit.variable}`} style={{ backgroundColor: '#F5EEE6' }}>
      <body style={{ backgroundColor: '#F5EEE6', color: '#1C2B38' }}>{children}</body>
    </html>
  )
}
