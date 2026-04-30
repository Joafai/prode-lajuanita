import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageDecor from '@/components/PageDecor'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: leaderboard } = await supabase.rpc('get_leaderboard')
  const myStats = leaderboard?.find((r) => r.user_id === user.id)
  const myRank = leaderboard ? leaderboard.findIndex((r) => r.user_id === user.id) + 1 : 0

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageDecor stickers={[
        { src: '/juanita-goal.png', side: 'left', vertical: 'bottom', rotate: -8, size: 420, offset: 60 },
        { src: '/juanita-kick.png', side: 'right', vertical: 'bottom', rotate: 10, size: 420, offset: 60 },
      ]} />

      <div className="font-bebas text-3xl tracking-widest text-gold mb-6 flex items-center gap-4">
        My Predictions
        <span className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { num: myStats?.total_pts ?? 0, label: 'Points' },
          { num: myRank > 0 ? `#${myRank}` : '-', label: 'Rank' },
          { num: myStats?.exact_count ?? 0, label: 'Exact' },
          { num: myStats?.picks_count ?? 0, label: 'Predictions' },
        ].map(({ num, label }) => (
          <div
            key={label}
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            className="rounded-xl p-5 text-center"
          >
            <div className="font-bebas text-5xl text-gold leading-none">{num}</div>
            <div className="text-xs text-muted mt-1 uppercase tracking-wide font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        className="rounded-xl p-5 mb-6"
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Points System</div>
        <div className="space-y-3">
          {[
            { pts: '+3', bg: '#2DAA5E', label: 'Exact score (e.g., 2-1 correct)' },
            { pts: '+1', bg: '#B8924A', label: 'Correct winner, wrong score' },
            { pts: '0', bg: 'rgba(212,64,64,0.12)', color: '#D44040', label: 'Wrong winner' },
          ].map(({ pts, bg, color, label }) => (
            <div key={pts} className="flex items-center gap-3">
              <span
                style={{ background: bg, color: color ?? '#fff' }}
                className="text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap"
              >
                {pts} pts
              </span>
              <span className="text-sm text-text">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/partidos"
        className="inline-block py-3 px-8 bg-navy text-white font-bold rounded-lg hover:bg-navy2 transition-colors text-sm"
      >
        Fill in predictions →
      </Link>
    </div>
  )
}
