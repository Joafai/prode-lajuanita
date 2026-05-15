import type { SupabaseClient } from '@supabase/supabase-js'
import { PHASE_ORDER, PHASE_LABELS, type Phase } from '@/lib/matches-data'
import { sendEmailBatch, type EmailMessage } from '@/lib/email-send'
import {
  phaseOpenEmail,
  phaseCloseEmail,
  tournamentEndEmail,
  winnerEmail,
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
  const { data: profiles } = await supabase.from('profiles').select('name, email')
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

  let leader: { name: string; points: number } | null = null
  let leaderUserId: string | null = null
  if (PRIZE_PHASES.includes(phase)) {
    const { data: leaderboard } = await supabase.rpc('get_leaderboard')
    if (leaderboard?.length) {
      leader = { name: leaderboard[0].name, points: leaderboard[0].total_pts }
      leaderUserId = leaderboard[0].user_id
    }
  }

  const { data: profiles } = await supabase.from('profiles').select('name, email')
  let result: NotifyResult = { sent: 0, failed: 0, total: 0, leader: leader?.name ?? null }
  if (profiles?.length) {
    const items: EmailMessage[] = profiles.map((p) => {
      const tpl = phaseCloseEmail({ appUrl, recipientName: p.name, phaseLabel, nextPhaseLabel, leader })
      return { to: p.email, subject: tpl.subject, html: tpl.html }
    })
    const batch = await sendEmailBatch(items)
    result = { ...batch, leader: leader?.name ?? null }
  }

  await supabase.from('active_phases').update({ is_active: false }).eq('phase', phase)

  // Lock in the prize-phase winner snapshot (only for prize phases). Upsert so
  // a manual re-trigger of close doesn't accidentally insert a duplicate row.
  if (leader && leaderUserId && PRIZE_PHASES.includes(phase)) {
    await supabase
      .from('stage_winners')
      .upsert(
        {
          stage_key: phase,
          user_id: leaderUserId,
          name: leader.name,
          points: leader.points,
          declared_at: new Date().toISOString(),
        },
        { onConflict: 'stage_key' }
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

  const items: EmailMessage[] = (leaderboard as LeaderboardRow[]).map((row, i) => {
    const tpl = tournamentEndEmail({
      appUrl,
      recipientName: row.name,
      position: i + 1,
      totalParticipants: total,
      points: row.total_pts,
      winnerName: winner.name,
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
