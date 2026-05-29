'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const baseItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/matches', label: 'Matches' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/how-to-play', label: 'How to Play' },
]

export default function NavBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = isAdmin ? [...baseItems, { href: '/admin', label: 'Admin' }] : baseItems

  return (
    <nav
      style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
      className="px-6 flex overflow-x-auto"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
            pathname === item.href
              ? 'text-gold border-gold'
              : 'text-muted border-transparent hover:text-text'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
