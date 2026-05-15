import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageDecor from '@/components/PageDecor'

export default async function TablaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: leaderboard }, { data: stageWinners }] = await Promise.all([
    supabase.rpc('get_leaderboard'),
    supabase.from('stage_winners').select('stage_key, name, points'),
  ])
  const ranking = leaderboard ?? []
  const medals = ['🥇', '🥈', '🥉']

  const winnersByKey = new Map(
    (stageWinners ?? []).map((w) => [w.stage_key, { name: w.name, points: Number(w.points) }])
  )
  const groupWinner = winnersByKey.get('grupos') ?? null
  const poolChampion = winnersByKey.get('pool_champion') ?? null
  const hasWinners = groupWinner || poolChampion

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

      {hasWinners && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Group Stage winner', data: groupWinner, fallback: 'Decided when the group stage ends' },
            { label: 'Pool champion', data: poolChampion, fallback: 'Decided when the tournament ends' },
          ].map(({ label, data, fallback }) => (
            <div
              key={label}
              style={{
                background: data ? '#FFFFFF' : '#F5EEE6',
                border: data ? '1px solid rgba(184,146,74,0.35)' : '1px dashed rgba(0,0,0,0.1)',
                boxShadow: data ? '0 2px 12px rgba(184,146,74,0.12)' : undefined,
              }}
              className="rounded-xl p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                {label}
              </div>
              {data ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-text text-base truncate">{data.name}</div>
                    <div className="text-xs text-muted2">{data.points} pts at stage close</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted leading-relaxed pt-0.5">{fallback}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {ranking.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <div className="text-5xl mb-4">🏆</div>
          <p>No participants yet</p>
        </div>
      ) : (
        <div
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          className="rounded-xl overflow-hidden"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#F5EEE6' }}>
                {['#', 'Player', 'Pts', 'Exact', 'Winner', 'Picks'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => {
                const isMe = r.user_id === user.id
                const posColors = ['text-gold', 'text-muted2', 'text-muted']
                return (
                  <tr
                    key={r.user_id}
                    style={{
                      borderBottom: i < ranking.length - 1 ? '1px solid rgba(0,0,0,0.06)' : undefined,
                      background: isMe ? 'rgba(184,146,74,0.05)' : undefined,
                    }}
                  >
                    <td className={`px-4 py-4 font-bebas text-2xl ${posColors[i] ?? 'text-muted'}`}>
                      {medals[i] ?? i + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-sm text-text">
                        {r.name}
                        {isMe && <span className="ml-1.5 text-gold text-xs font-normal">(you)</span>}
                      </div>
                      <div className="text-xs text-muted">{r.email}</div>
                    </td>
                    <td className="px-4 py-4 font-bebas text-3xl text-gold">{r.total_pts}</td>
                    <td className="px-4 py-4 font-semibold text-green text-sm">{r.exact_count}</td>
                    <td className="px-4 py-4 font-semibold text-gold text-sm">{r.winner_count}</td>
                    <td className="px-4 py-4 text-muted text-sm">{r.picks_count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
