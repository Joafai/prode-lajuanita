import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { Phase } from '@/lib/matches-data'
import { notifyPhaseOpen, notifyPhaseClose, notifyTournamentEnd, notifyWinner } from '@/lib/notify-actions'

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z')
const TOURNAMENT_END   = new Date('2026-07-20T23:59:59Z')

// Maps football-data.org stage codes → our phase IDs
const STAGE_TO_PHASE: Record<string, string> = {
  ROUND_OF_32:   'dieciseisavos',
  ROUND_OF_16:   'octavos',
  QUARTER_FINALS: 'cuartos',
  SEMI_FINALS:   'semis',
  THIRD_PLACE:   'tercero',
  FINAL:         'final',
}

// Maps football-data.org team names → our DB names
const TEAM_NAME_MAP: Record<string, string> = {
  'Mexico': 'Mexico', 'South Korea': 'South Korea', 'South Africa': 'South Africa',
  'Czech Republic': 'Czech Republic', 'Canada': 'Canada', 'Switzerland': 'Switzerland',
  'Qatar': 'Qatar', 'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia & Herzegovina', 'Brazil': 'Brazil',
  'Morocco': 'Morocco', 'Haiti': 'Haiti', 'Scotland': 'Scotland',
  'United States': 'USA', 'USA': 'USA', 'Australia': 'Australia',
  'Paraguay': 'Paraguay', 'Turkey': 'Turkey', 'Germany': 'Germany',
  'Curaçao': 'Curaçao', 'Curazao': 'Curaçao',
  "Côte d'Ivoire": "Côte d'Ivoire", 'Ivory Coast': "Côte d'Ivoire",
  'Ecuador': 'Ecuador', 'Netherlands': 'Netherlands', 'Japan': 'Japan',
  'Sweden': 'Sweden', 'Tunisia': 'Tunisia', 'Belgium': 'Belgium',
  'Iran': 'Iran', 'IR Iran': 'Iran', 'Egypt': 'Egypt',
  'New Zealand': 'New Zealand', 'Spain': 'Spain', 'Uruguay': 'Uruguay',
  'Saudi Arabia': 'Saudi Arabia', 'Cape Verde': 'Cape Verde', 'France': 'France',
  'Senegal': 'Senegal', 'Norway': 'Norway', 'Iraq': 'Iraq',
  'Argentina': 'Argentina', 'Austria': 'Austria', 'Algeria': 'Algeria',
  'Jordan': 'Jordan', 'Portugal': 'Portugal', 'Colombia': 'Colombia',
  'Uzbekistan': 'Uzbekistan', 'DR Congo': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo', 'England': 'England',
  'Croatia': 'Croatia', 'Panama': 'Panama', 'Ghana': 'Ghana',
}

function normalize(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

async function runSync() {
  const now = new Date()
  if (now < TOURNAMENT_START || now > TOURNAMENT_END) {
    return { skipped: true, reason: 'Outside tournament window', updated: 0 }
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) return { error: 'FOOTBALL_DATA_API_KEY not configured', updated: 0 }

  // Fetch all WC matches from the API
  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches',
    { headers: { 'X-Auth-Token': apiKey }, next: { revalidate: 0 } }
  )
  if (!res.ok) return { error: `API error: ${res.status} ${res.statusText}`, updated: 0 }

  const data = await res.json()
  const apiMatches: {
    stage: string
    status: string
    utcDate: string
    homeTeam: { name: string }
    awayTeam: { name: string }
    score: { fullTime: { home: number | null; away: number | null } }
  }[] = data.matches ?? []

  const supabase = createAdminClient()
  const [{ data: dbMatches }, { data: dbPhases }] = await Promise.all([
    supabase.from('matches').select('*'),
    supabase.from('active_phases').select('*'),
  ])

  let teamsUpdated = 0
  let scoresUpdated = 0
  let phasesActivated = 0

  // ── STEP 1: Update TBD team names for knockout matches ──────────────────────
  for (const apiMatch of apiMatches) {
    const phase = STAGE_TO_PHASE[apiMatch.stage]
    if (!phase) continue
    if (!apiMatch.homeTeam?.name || !apiMatch.awayTeam?.name) continue

    const homeTeam = normalize(apiMatch.homeTeam.name)
    const awayTeam = normalize(apiMatch.awayTeam.name)
    const apiDate = new Date(apiMatch.utcDate)

    // Find our DB match by phase + date (within 2h window)
    const dbMatch = dbMatches?.find((m) => {
      if (m.phase !== phase || !m.match_date) return false
      const diff = Math.abs(new Date(m.match_date).getTime() - apiDate.getTime())
      return diff < 2 * 60 * 60 * 1000
    })

    if (dbMatch && (dbMatch.home_team.startsWith('TBD') || dbMatch.away_team.startsWith('TBD'))) {
      await supabase.from('matches').update({ home_team: homeTeam, away_team: awayTeam }).eq('id', dbMatch.id)
      dbMatch.home_team = homeTeam
      dbMatch.away_team = awayTeam
      teamsUpdated++
    }
  }

  // ── STEP 2: Update scores for finished matches ───────────────────────────────
  for (const apiMatch of apiMatches) {
    if (apiMatch.status !== 'FINISHED') continue
    if (apiMatch.score?.fullTime?.home === null || apiMatch.score?.fullTime?.away === null) continue

    const homeTeam = normalize(apiMatch.homeTeam?.name ?? '')
    const awayTeam = normalize(apiMatch.awayTeam?.name ?? '')
    const homeScore = apiMatch.score.fullTime.home!
    const awayScore = apiMatch.score.fullTime.away!

    const dbMatch = dbMatches?.find(
      (m) => m.home_team === homeTeam && m.away_team === awayTeam && m.home_score === null
    )

    if (dbMatch) {
      await supabase.from('matches').update({ home_score: homeScore, away_score: awayScore }).eq('id', dbMatch.id)
      scoresUpdated++
    }
  }

  // ── STEP 3: Auto-activate phases 48h before first match ─────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inactivePhases = dbPhases?.filter((p) => !p.is_active) ?? []
  const activatedPhases: Phase[] = []
  for (const phase of inactivePhases) {
    const phaseMatches = dbMatches?.filter((m) => m.phase === phase.phase && m.match_date) ?? []
    if (!phaseMatches.length) continue

    // Check that no teams are TBD (phase is ready)
    const allTeamsKnown = phaseMatches.every(
      (m) => !m.home_team.startsWith('TBD') && !m.away_team.startsWith('TBD')
    )
    if (!allTeamsKnown) continue

    const earliest = phaseMatches.reduce((min, m) => {
      const d = new Date(m.match_date!)
      return d < min ? d : min
    }, new Date('9999-01-01'))

    const hoursUntil = (earliest.getTime() - now.getTime()) / (60 * 60 * 1000)

    if (hoursUntil <= 48 && hoursUntil > 0) {
      await supabase
        .from('active_phases')
        .update({ is_active: true, activated_at: now.toISOString() })
        .eq('phase', phase.phase)
      phasesActivated++
      activatedPhases.push(phase.phase as Phase)
    }
  }

  // Fire phase_open blast for every phase activated above. Wrapped in try/catch
  // so an SMTP outage doesn't roll back the activation — admin can re-send
  // manually from the panel if needed.
  let phaseOpenEmailsSent = 0
  for (const phase of activatedPhases) {
    try {
      await notifyPhaseOpen(supabase, phase, appUrl)
      phaseOpenEmailsSent++
    } catch {
      // swallow — phase stays active, manual re-send remains available
    }
  }

  // ── STEP 4: Auto-close phases whose matches are all finished ────────────────
  // For each active phase, if every match has a score we close it: send the
  // phase_close email (with prize-winner block for grupos / dieciseisavos) and
  // flip is_active=false. The flag is the dedup gate — once flipped, this
  // branch is skipped on future runs. When the closed phase is `final`, also
  // fires the tournament_end + winner emails before exiting.
  let phasesClosed = 0
  let tournamentEnded = false
  let winnerNotified = false

  // Re-fetch matches and active_phases — they may have changed in earlier steps
  const [{ data: matchesAfter }, { data: phasesAfter }] = await Promise.all([
    supabase.from('matches').select('*'),
    supabase.from('active_phases').select('*'),
  ])

  const activeNow = (phasesAfter ?? []).filter((p) => p.is_active)
  for (const phaseRow of activeNow) {
    const phase = phaseRow.phase as Phase
    const phaseMatches = (matchesAfter ?? []).filter((m) => m.phase === phase)
    if (!phaseMatches.length) continue
    const allFinished = phaseMatches.every((m) => m.home_score !== null && m.away_score !== null)
    if (!allFinished) continue

    try {
      await notifyPhaseClose(supabase, phase, appUrl)
      phasesClosed++
      if (phase === 'final') {
        await notifyTournamentEnd(supabase, appUrl)
        tournamentEnded = true
        await notifyWinner(supabase, appUrl)
        winnerNotified = true
      }
    } catch {
      // If SMTP fails, leave is_active=true so the next cron run retries.
      // notifyPhaseClose flips is_active only after a successful batch.
    }
  }

  return {
    teamsUpdated,
    scoresUpdated,
    phasesActivated,
    phaseOpenEmailsSent,
    phasesClosed,
    tournamentEnded,
    winnerNotified,
    error: null,
  }
}

// POST — admin-triggered from the panel
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await runSync()
  return NextResponse.json(result)
}

// GET — Vercel cron (every 12h, Vercel passes Authorization: Bearer CRON_SECRET)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSync()
  return NextResponse.json(result)
}
