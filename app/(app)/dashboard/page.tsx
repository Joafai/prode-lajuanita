import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PageDecor from '@/components/PageDecor'
import { denseRank } from '@/lib/ranking'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: leaderboard } = await supabase.rpc('get_leaderboard')
  const ranking = leaderboard ?? []
  const myStats = ranking.find((r) => r.user_id === user.id)
  const ranks = denseRank(ranking.map((r) => ({ total_pts: Number(r.total_pts) })))
  const myIndex = ranking.findIndex((r) => r.user_id === user.id)
  const myRank = myIndex >= 0 ? ranks[myIndex] : null

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
          { num: myRank !== null && myRank !== undefined ? `#${myRank}` : '—', label: 'Rank' },
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
            {
              pts: '+3',
              bg: '#2DAA5E',
              label: 'Exact score',
              detail: 'You nail both numbers — draws count too (e.g. predict 1-1, real is 1-1).',
            },
            {
              pts: '+1',
              bg: '#B8924A',
              label: 'Correct outcome',
              detail: 'You got the right winner OR the right draw, but the score is off (e.g. predict 3-3, real is 1-1; or predict 2-0, real is 3-1).',
            },
            {
              pts: '0',
              bg: 'rgba(212,64,64,0.12)',
              color: '#D44040',
              label: 'Wrong outcome',
              detail: 'Picked a winner and there was a draw, or vice-versa, or the wrong side won.',
            },
          ].map(({ pts, bg, color, label, detail }) => (
            <div key={pts} className="flex items-start gap-3">
              <span
                style={{ background: bg, color: color ?? '#fff' }}
                className="text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap mt-0.5"
              >
                {pts} pts
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{label}</p>
                <p className="text-xs text-muted2 mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/matches"
        className="inline-block py-3 px-8 bg-navy text-white font-bold rounded-lg hover:bg-navy2 transition-colors text-sm"
      >
        Fill in predictions →
      </Link>

      <div className="font-bebas text-3xl tracking-widest text-gold mt-10 mb-6 flex items-center gap-4">
        Prizes
        <span className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8 lg:-mx-32 xl:-mx-48">
        {[
          { src: '/group-stage-prizes.jpg', alt: 'Group Stage prizes podium', width: 1158, height: 1158 },
          { src: '/knockout-stage-prizes.jpg', alt: 'Knockout Stage prizes podium', width: 1158, height: 1158 },
        ].map(({ src, alt, width, height }) => (
          <div
            key={src}
            style={{ background: '#FFFFFF', border: '2px solid #88ABBE', boxShadow: '0 2px 12px rgba(136,171,190,0.18)' }}
            className="rounded-xl overflow-hidden"
          >
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              className="w-full h-auto block"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
