import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageDecor from '@/components/PageDecor'
import { denseRank } from '@/lib/ranking'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [
    { data: leaderboard },
    { data: stageWinners },
    { count: playedCount },
  ] = await Promise.all([
    supabase.rpc('get_leaderboard'),
    supabase.from('stage_winners').select('stage_key, name, points, position').order('position'),
    // Counts matches with a real result. If zero, the tournament hasn't started
    // scoring yet → we render the "waiting for kickoff" placeholder instead of
    // an everyone-at-0 table.
    supabase.from('matches').select('id', { count: 'exact', head: true }).not('home_score', 'is', null),
  ])
  const tournamentStarted = (playedCount ?? 0) > 0
  const ranking = leaderboard ?? []
  const ranks = denseRank(ranking.map((r) => ({ total_pts: Number(r.total_pts), exact_count: Number(r.exact_count) })))
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  // A row is "in a pts tie" when it shares total_pts with the row above or
  // below. We use this to flag rows where the exact-count tiebreaker decided
  // the order (or kept them at a shared position when exacts also match).
  const tied = ranking.map((r, i) => {
    const pts = Number(r.total_pts)
    if (pts === 0) return false
    const prev = ranking[i - 1]
    const next = ranking[i + 1]
    return (
      (prev && Number(prev.total_pts) === pts) ||
      (next && Number(next.total_pts) === pts)
    )
  })

  // Group stage_winners rows by stage_key, preserving the (position 1..3) order
  const podiumByStage = new Map<string, { name: string; points: number; position: number }[]>()
  for (const w of stageWinners ?? []) {
    const arr = podiumByStage.get(w.stage_key) ?? []
    arr.push({ name: w.name, points: Number(w.points), position: Number(w.position ?? 1) })
    podiumByStage.set(w.stage_key, arr)
  }
  const groupPodium = podiumByStage.get('grupos') ?? null
  const poolPodium = podiumByStage.get('pool_champion') ?? null
  const hasWinners = (groupPodium && groupPodium.length) || (poolPodium && poolPodium.length)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 relative z-10">
      <PageDecor stickers={[
        { src: '/juanita-trophy.png', side: 'left', vertical: 'bottom', rotate: -8, size: 420, offset: 60 },
        { src: '/juanita-flag.png', side: 'right', vertical: 'bottom', rotate: 8, size: 420, offset: 60 },
      ]} />

      <div className="font-bebas text-3xl tracking-widest text-gold mb-6 flex items-center gap-4">
        Leaderboard
        <span className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
      </div>

      {!tournamentStarted && (
        <div
          style={{ background: '#FFFFFF', border: '1px solid rgba(184,146,74,0.35)', boxShadow: '0 2px 12px rgba(184,146,74,0.12)' }}
          className="rounded-xl px-6 py-10 text-center"
        >
          <div className="text-5xl mb-4">⚽</div>
          <p className="font-bebas text-2xl tracking-widest text-gold mb-2">
            The World Cup hasn&apos;t kicked off yet
          </p>
          <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
            Standings will appear here as soon as the first match is played. In the meantime, lock in your predictions on the <strong className="text-text">Matches</strong> tab.
          </p>
        </div>
      )}

      {tournamentStarted && hasWinners && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {/* Group Stage podium */}
          <div
            style={{
              background: groupPodium && groupPodium.length ? '#FFFFFF' : '#F5EEE6',
              border: groupPodium && groupPodium.length ? '1px solid rgba(184,146,74,0.35)' : '1px dashed rgba(0,0,0,0.1)',
              boxShadow: groupPodium && groupPodium.length ? '0 2px 12px rgba(184,146,74,0.12)' : undefined,
            }}
            className="rounded-xl p-4"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Group Stage podium
            </div>
            {groupPodium && groupPodium.length ? (
              <div className="space-y-1.5">
                {groupPodium.map((w, i) => (
                  <div key={`${w.position}-${i}`} className="flex items-center gap-2.5">
                    <span className="text-lg w-6 text-center">{medals[w.position] ?? `#${w.position}`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text text-sm truncate">{w.name}</div>
                    </div>
                    <div className="text-xs text-muted2 whitespace-nowrap">{w.points} pts</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted leading-relaxed pt-0.5">Decided when the group stage ends</div>
            )}
          </div>

          {/* Pool champion podium */}
          <div
            style={{
              background: poolPodium && poolPodium.length ? '#FFFFFF' : '#F5EEE6',
              border: poolPodium && poolPodium.length ? '1px solid rgba(184,146,74,0.35)' : '1px dashed rgba(0,0,0,0.1)',
              boxShadow: poolPodium && poolPodium.length ? '0 2px 12px rgba(184,146,74,0.12)' : undefined,
            }}
            className="rounded-xl p-4"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Pool champion
            </div>
            {poolPodium && poolPodium.length ? (
              <div className="space-y-1.5">
                {poolPodium.map((w, i) => (
                  <div key={`${w.position}-${i}`} className="flex items-center gap-2.5">
                    <span className="text-lg w-6 text-center">{medals[w.position] ?? `#${w.position}`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text text-sm truncate">{w.name}</div>
                    </div>
                    <div className="text-xs text-muted2 whitespace-nowrap">{w.points} pts</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted leading-relaxed pt-0.5">Decided when the tournament ends</div>
            )}
          </div>
        </div>
      )}

      {tournamentStarted && ranking.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <div className="text-5xl mb-4">🏆</div>
          <p>No participants yet</p>
        </div>
      ) : tournamentStarted ? (
        <div
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          className="rounded-xl overflow-hidden"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#F5EEE6' }}>
                {[
                  { label: '#', align: 'center' },
                  { label: 'Player', align: 'left' },
                  { label: 'Pts', align: 'center' },
                  { label: 'Exact', align: 'center' },
                  { label: 'Outcome', align: 'center' },
                  { label: 'Picks', align: 'center' },
                ].map(({ label, align }) => (
                  <th key={label} className={`text-${align} px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => {
                const isMe = r.user_id === user.id
                const rank = ranks[i]
                const posColor =
                  rank === 1 ? 'text-gold' : rank === 2 ? 'text-muted2' : rank === 3 ? 'text-muted' : 'text-muted'
                return (
                  <tr
                    key={r.user_id}
                    style={{
                      borderBottom: i < ranking.length - 1 ? '1px solid rgba(0,0,0,0.06)' : undefined,
                      background: isMe ? 'rgba(184,146,74,0.05)' : undefined,
                    }}
                  >
                    <td className={`px-4 py-4 text-center font-bebas text-2xl ${posColor}`}>
                      {rank === null ? <span className="text-muted">—</span> : (medals[rank] ?? rank)}
                    </td>
                    <td className="px-4 py-4 text-left">
                      <div className="font-semibold text-sm text-text">
                        {r.name}
                        {isMe && <span className="ml-1.5 text-gold text-xs font-normal">(you)</span>}
                      </div>
                      {r.email && <div className="text-xs text-muted">{r.email}</div>}
                    </td>
                    <td className="px-4 py-4 text-center font-bebas text-3xl text-gold">{r.total_pts}</td>
                    <td className="px-4 py-4 text-center font-semibold text-green text-sm">
                      {r.exact_count}
                      {tied[i] && (
                        <div className="text-[10px] font-normal text-muted2 mt-0.5 leading-tight">
                          tiebreaker
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-gold text-sm">{r.winner_count}</td>
                    <td className="px-4 py-4 text-center text-muted text-sm">{r.picks_count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tournamentStarted && ranking.length > 0 && (
        <p className="text-xs text-muted2 text-center mt-4 leading-relaxed">
          Ties on total points are broken by who has more exact-score predictions.
        </p>
      )}
    </div>
  )
}
