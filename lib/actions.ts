'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { PHASE_ORDER, type Phase } from '@/lib/matches-data'

const MAX_TEAM_NAME_LEN = 60

// Server-side mirror of the client's match-lock window: picks lock 1h before
// kickoff. Kept in sync with `isMatchLocked` in lib/matches-data.ts.
const PICK_LOCK_MS = 60 * 60 * 1000

function sanitizeScore(raw: unknown): number | null {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 0 || n > 99) return null
  return n
}

export async function savePicks(
  picks: { matchId: string; homeScore: number; awayScore: number }[]
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!Array.isArray(picks) || picks.length === 0) {
    return { error: 'No picks supplied' }
  }
  // Cap batch size to a sane upper bound so a malicious client can't post a
  // 100k-row payload and OOM the route.
  if (picks.length > 500) return { error: 'Too many picks' }

  // Normalize matchIds (strip non-strings) before the DB lookup.
  const matchIds = Array.from(
    new Set(picks.map((p) => p.matchId).filter((id): id is string => typeof id === 'string' && id.length > 0))
  )
  if (matchIds.length === 0) return { error: 'Invalid pick ids' }

  // Server-side guards (the client respects these but the previous version
  // trusted the client entirely). The 1h pre-kickoff lock is skipped in
  // SIMULATION_MODE so the local E2E flow can still poke picks.
  const simulationMode = process.env.SIMULATION_MODE === 'true'
  const [{ data: matches, error: matchErr }, { data: activeRows, error: phaseErr }] = await Promise.all([
    supabase.from('matches').select('id, phase, match_date, home_score').in('id', matchIds),
    supabase.from('active_phases').select('phase').eq('is_active', true),
  ])
  if (matchErr) return { error: matchErr.message }
  if (phaseErr) return { error: phaseErr.message }

  const matchById = new Map((matches ?? []).map((m) => [m.id, m]))
  const activePhases = new Set((activeRows ?? []).map((p) => p.phase))
  const now = Date.now()

  const validRows: {
    user_id: string
    match_id: string
    home_score: number
    away_score: number
    updated_at: string
  }[] = []
  for (const p of picks) {
    const m = matchById.get(p.matchId)
    if (!m) continue
    // Phase must currently be active for picks to be written.
    if (!activePhases.has(m.phase)) continue
    // Match with a real result is locked forever — no late edits.
    if (m.home_score !== null) continue
    // 1h pre-kickoff lock (skipped in simulation mode where match_date is
    // historical and would always be "in the past").
    if (!simulationMode && m.match_date) {
      const msUntil = new Date(m.match_date).getTime() - now
      if (msUntil < PICK_LOCK_MS) continue
    }
    const home = sanitizeScore(p.homeScore)
    const away = sanitizeScore(p.awayScore)
    if (home === null || away === null) continue
    validRows.push({
      user_id: user.id,
      match_id: p.matchId,
      home_score: home,
      away_score: away,
      updated_at: new Date().toISOString(),
    })
  }

  if (validRows.length === 0) {
    return { error: 'No editable picks in this batch' }
  }

  const { error } = await supabase
    .from('picks')
    .upsert(validRows, { onConflict: 'user_id,match_id' })

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  revalidatePath('/leaderboard')

  return { error: error?.message, saved: validRows.length, rejected: picks.length - validRows.length }
}

export async function saveResult(matchId: string, homeScore: number, awayScore: number) {
  if (typeof matchId !== 'string' || !matchId) return { error: 'Invalid match id' }
  const home = sanitizeScore(homeScore)
  const away = sanitizeScore(awayScore)
  if (home === null || away === null) return { error: 'Invalid score' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'No autorizado' }

  // Verify the row exists before update so the admin gets a useful "not found"
  // instead of a silent no-op when matchId is wrong / fabricated.
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .maybeSingle()
  if (!match) return { error: 'Match not found' }

  const { error } = await supabase
    .from('matches')
    .update({ home_score: home, away_score: away })
    .eq('id', matchId)

  revalidatePath('/admin')
  revalidatePath('/leaderboard')
  revalidatePath('/matches')

  return { error: error?.message }
}

export async function updateMatchTeams(matchId: string, homeTeam: string, awayTeam: string) {
  if (typeof matchId !== 'string' || !matchId) return { error: 'Invalid match id' }
  const home = typeof homeTeam === 'string' ? homeTeam.trim() : ''
  const away = typeof awayTeam === 'string' ? awayTeam.trim() : ''
  if (!home || !away) return { error: 'Team names required' }
  if (home.length > MAX_TEAM_NAME_LEN || away.length > MAX_TEAM_NAME_LEN) {
    return { error: 'Team name too long' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'No autorizado' }

  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .maybeSingle()
  if (!match) return { error: 'Match not found' }

  const { error } = await supabase
    .from('matches')
    .update({ home_team: home, away_team: away })
    .eq('id', matchId)

  revalidatePath('/admin')
  revalidatePath('/matches')

  return { error: error?.message }
}

export async function togglePhase(phase: string, isActive: boolean) {
  // Reject phase strings that aren't real DB phases — guarantees the update
  // either hits a real row or is rejected outright, no `togglePhase('hax', true)`
  // shenanigans inserting orphan state.
  if (!(PHASE_ORDER as readonly string[]).includes(phase)) {
    return { error: 'Invalid phase' }
  }
  if (typeof isActive !== 'boolean') return { error: 'Invalid is_active' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('active_phases')
    .update({
      is_active: isActive,
      activated_at: isActive ? new Date().toISOString() : null,
    })
    .eq('phase', phase as Phase)

  revalidatePath('/admin')
  revalidatePath('/matches')

  return { error: error?.message }
}

// makeAdmin: per-user rate limit (max ADMIN_ATTEMPT_LIMIT failures per
// ADMIN_ATTEMPT_WINDOW_MS) + timing-safe password comparison. The attempts
// table (migration 011) is wiped after a successful unlock so an admin's
// previous typos don't haunt them.
const ADMIN_ATTEMPT_LIMIT = 5
const ADMIN_ATTEMPT_WINDOW_MS = 60 * 60 * 1000 // 1h

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function makeAdmin(password: string) {
  const adminPass = process.env.ADMIN_PASSWORD ?? 'juanita2026'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Count recent failures BEFORE checking the password so a guesser can't
  // bypass by varying inputs.
  const sinceIso = new Date(Date.now() - ADMIN_ATTEMPT_WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('admin_login_attempts')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('attempted_at', sinceIso)
  if ((count ?? 0) >= ADMIN_ATTEMPT_LIMIT) {
    return { error: 'Too many attempts. Try again in 1 hour.' }
  }

  if (!timingSafeMatch(password ?? '', adminPass)) {
    // Record the failure. Best-effort: ignore insert errors so a DB hiccup
    // doesn't leak success/failure timing.
    await supabase.from('admin_login_attempts').insert({ user_id: user.id })
    return { error: 'Contraseña incorrecta' }
  }

  // Success — clear prior failed attempts and promote.
  await supabase.from('admin_login_attempts').delete().eq('user_id', user.id)
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', user.id)

  revalidatePath('/admin')

  return { error: error?.message }
}
