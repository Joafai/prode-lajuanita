import type { SupabaseClient } from '@supabase/supabase-js'
import { PHASE_ORDER, PHASE_LABELS, type Phase } from '@/lib/matches-data'
import { sendEmailBatch, type EmailMessage } from '@/lib/email-send'
import { denseRank } from '@/lib/ranking'
import {
  phaseOpenEmail,
  phaseCloseEmail,
  tournamentEndEmail,
  winnerEmail,
  type PodiumEntry,
} from '@/lib/email-templates'

export const PRIZE_PHASES: Phase[] = ['grupos']

interface LeaderboardRow {
  user_id: string
  name: string
  email: string
  total_pts: number
  exact_count: number
  winner_count: number
  picks_count: number
}

export interface NotifyResult {
  sent: number
  failed: number
  total: number
  leader?: string | null
  winner?: string | null
}

export async function notifyPhaseOpen(
  supabase: SupabaseClient,
  phase: Phase,
  appUrl: string
): Promise<NotifyResult> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('name, email')
    .not('confirmed_at', 'is', null)
    .eq('is_admin', false)
  if (!profiles?.length) return { sent: 0, failed: 0, total: 0 }

  const items: EmailMessage[] = profiles.map((p) => {
    const tpl = phaseOpenEmail({ appUrl, recipientName: p.name, phaseLabel: PHASE_LABELS[phase] })
    return { to: p.email, subject: tpl.subject, html: tpl.html }
  })
  return await sendEmailBatch(items)
}

/**
 * Closes a phase: sends the phase_close email to everyone and marks
 * is_active=false on active_phases. The is_active flag is the dedup gate —
 * once a phase is closed, neither the cron nor a second manual click will
 * re-send. Prize-phase leader is auto-detected from the leaderboard.
 */
export async function notifyPhaseClose(
  supabase: SupabaseClient,
  phase: Phase,
  appUrl: string
): Promise<NotifyResult> {
  const phaseLabel = PHASE_LABELS[phase]
  const phaseIdx = PHASE_ORDER.indexOf(phase)
  const nextPhase = phaseIdx >= 0 && phaseIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[phaseIdx + 1] : null
  const nextPhaseLabel = nextPhase ? PHASE_LABELS[nextPhase] : null

  // Build the podium (positions 1-3 with ties) for prize phases. Empates en la
  // misma posición → ambos entran en el podio compartiendo la misma `position`.
  let podium: (PodiumEntry & { user_id: string; email: string })[] = []
  if (PRIZE_PHASES.includes(phase)) {
    const { data: leaderboard } = await supabase.rpc('get_leaderboard')
    const rows = (leaderboard ?? []) as LeaderboardRow[]
    if (rows.length) {
      const ranks = denseRank(rows.map((r) => ({ total_pts: Number(r.total_pts) })))
      podium = rows
        .map((row, i) => ({ row, rank: ranks[i] }))
        .filter((x): x is { row: LeaderboardRow; rank: number } => x.rank !== null && x.rank <= 3)
        .map((x) => ({
          name: x.row.name,
          points: Number(x.row.total_pts),
          position: x.rank as 1 | 2 | 3,
          user_id: x.row.user_id,
          email: x.row.email,
        }))
    }
  }

  // Lookup: email → podium position (used to render the personalized prize-claim
  // variant for top-3 recipients).
  const positionByEmail = new Map<string, 1 | 2 | 3>()
  for (const p of podium) positionByEmail.set(p.email, p.position)

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('name, email')
    .not('confirmed_at', 'is', null)
    .eq('is_admin', false)
  if (profilesErr) console.error('[notifyPhaseClose] profiles query error:', profilesErr)

  const podiumForEmail = podium.map(({ name, points, position }) => ({ name, points, position }))
  const leaderName = podium[0]?.name ?? null
  const stageKey: 'grupos' | null = phase === 'grupos' ? 'grupos' : null
  let result: NotifyResult = { sent: 0, failed: 0, total: 0, leader: leaderName }
  if (profiles?.length) {
    const items: EmailMessage[] = profiles.map((p) => {
      const recipientPosition = positionByEmail.get(p.email) ?? null
      const tpl = phaseCloseEmail({
        appUrl,
        recipientName: p.name,
        phaseLabel,
        nextPhaseLabel,
        podium: podiumForEmail.length ? podiumForEmail : null,
        recipientPosition,
        stageKey: recipientPosition ? stageKey : null,
      })
      return { to: p.email, subject: tpl.subject, html: tpl.html }
    })
    const batch = await sendEmailBatch(items)
    result = { ...batch, leader: leaderName }
  }

  await supabase.from('active_phases').update({ is_active: false }).eq('phase', phase)

  // Lock in the prize-phase podium snapshot (only for prize phases). Wipe any
  // previous rows for this stage_key first, then insert the current top 3 so a
  // re-trigger picks up any leaderboard changes.
  if (podium.length && PRIZE_PHASES.includes(phase)) {
    await supabase.from('stage_winners').delete().eq('stage_key', phase)
    await supabase.from('stage_winners').insert(
      podium.map((p) => ({
        stage_key: phase,
        user_id: p.user_id,
        name: p.name,
        points: p.points,
        position: p.position,
        declared_at: new Date().toISOString(),
      }))
    )
  }

  return result
}

export async function notifyTournamentEnd(
  supabase: SupabaseClient,
  appUrl: string
): Promise<NotifyResult> {
  const { data: leaderboard, error } = await supabase.rpc('get_leaderboard')
  if (error) throw new Error(error.message)
  if (!leaderboard?.length) return { sent: 0, failed: 0, total: 0 }

  const total = leaderboard.length
  const winner = leaderboard[0]

  // Lock in the pool-champion snapshot before sending so the leaderboard banner
  // can show it even if email delivery fails partially.
  await supabase
    .from('stage_winners')
    .upsert(
      {
        stage_key: 'pool_champion',
        user_id: winner.user_id,
        name: winner.name,
        points: winner.total_pts,
        declared_at: new Date().toISOString(),
      },
      { onConflict: 'stage_key' }
    )

  // Compute dense rank so top-3 (with possible ties) get the personalized
  // prize-claim variant instead of the generic "your finish" recap.
  const rows = leaderboard as LeaderboardRow[]
  const ranks = denseRank(rows.map((r) => ({ total_pts: Number(r.total_pts) })))

  const items: EmailMessage[] = rows.map((row, i) => {
    const rank = ranks[i]
    const recipientPodiumPosition: 1 | 2 | 3 | null =
      rank === 1 || rank === 2 || rank === 3 ? rank : null
    const tpl = tournamentEndEmail({
      appUrl,
      recipientName: row.name,
      position: i + 1,
      totalParticipants: total,
      points: Number(row.total_pts),
      winnerName: winner.name,
      recipientPodiumPosition,
    })
    return { to: row.email, subject: tpl.subject, html: tpl.html }
  })
  const batch = await sendEmailBatch(items)
  return { ...batch, winner: winner.name }
}

export async function notifyWinner(
  supabase: SupabaseClient,
  appUrl: string
): Promise<NotifyResult> {
  const { data: leaderboard, error } = await supabase.rpc('get_leaderboard')
  if (error) throw new Error(error.message)
  if (!leaderboard?.length) throw new Error('Empty leaderboard')

  const winner = leaderboard[0]
  const tpl = winnerEmail({ appUrl, recipientName: winner.name, points: winner.total_pts })
  const batch = await sendEmailBatch([
    { to: winner.email, subject: tpl.subject, html: tpl.html },
  ])
  return { ...batch, winner: winner.name }
}
