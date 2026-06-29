import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { Phase } from '@/lib/matches-data'
import { notifyPhaseOpen, notifyPhaseClose, notifyTournamentEnd, notifyWinner } from '@/lib/notify-actions'

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z')
const TOURNAMENT_END   = new Date('2026-07-20T23:59:59Z')

// Maps football-data.org stage codes → our phase IDs
const STAGE_TO_PHASE: Record<string, string> = {
  // football-data.org returns LAST_32 / LAST_16 for the WC round of 32 / 16.
  // ROUND_OF_* kept as aliases in case the API ever switches codes.
  LAST_32:       'dieciseisavos',
  ROUND_OF_32:   'dieciseisavos',
  LAST_16:       'octavos',
  ROUND_OF_16:   'octavos',
  QUARTER_FINALS: 'cuartos',
  SEMI_FINALS:   'semis',
  THIRD_PLACE:   'tercero',
  FINAL:         'final',
}

// Maps football-data.org team names → our DB names
const TEAM_NAME_MAP: Record<string, string> = {
  'Mexico': 'Mexico', 'South Korea': 'South Korea', 'South Africa': 'South Africa',
  'Czech Republic': 'Czech Republic', 'Czechia': 'Czech Republic',
  'Canada': 'Canada', 'Switzerland': 'Switzerland',
  'Qatar': 'Qatar', 'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia & Herzegovina', 'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Brazil': 'Brazil',
  'Morocco': 'Morocco', 'Haiti': 'Haiti', 'Scotland': 'Scotland',
  'United States': 'USA', 'USA': 'USA', 'Australia': 'Australia',
  'Paraguay': 'Paraguay', 'Turkey': 'Turkey', 'Germany': 'Germany',
  'Curaçao': 'Curaçao', 'Curazao': 'Curaçao',
  "Côte d'Ivoire": "Côte d'Ivoire", 'Ivory Coast': "Côte d'Ivoire",
  'Ecuador': 'Ecuador', 'Netherlands': 'Netherlands', 'Japan': 'Japan',
  'Sweden': 'Sweden', 'Tunisia': 'Tunisia', 'Belgium': 'Belgium',
  'Iran': 'Iran', 'IR Iran': 'Iran', 'Egypt': 'Egypt',
  'New Zealand': 'New Zealand', 'Spain': 'Spain', 'Uruguay': 'Uruguay',
  'Saudi Arabia': 'Saudi Arabia', 'Cape Verde': 'Cape Verde',
  'Cape Verde Islands': 'Cape Verde', 'France': 'France',
  'Senegal': 'Senegal', 'Norway': 'Norway', 'Iraq': 'Iraq',
  'Argentina': 'Argentina', 'Austria': 'Austria', 'Algeria': 'Algeria',
  'Jordan': 'Jordan', 'Portugal': 'Portugal', 'Colombia': 'Colombia',
  'Uzbekistan': 'Uzbekistan', 'DR Congo': 'DR Congo', 'Congo DR': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo', 'England': 'England',
  'Croatia': 'Croatia', 'Panama': 'Panama', 'Ghana': 'Ghana',
}

function normalize(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

async function runSync() {
  const now = new Date()
  const simulationMode = process.env.SIMULATION_MODE === 'true'

  if (!simulationMode && (now < TOURNAMENT_START || now > TOURNAMENT_END)) {
    return { skipped: true, reason: 'Outside tournament window', updated: 0 }
  }

  const supabase = createAdminClient()
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  let teamsUpdated = 0
  let scoresUpdated = 0
  let phasesActivated = 0

  // In SIMULATION_MODE we skip the football-data.org sync entirely — scores
  // and team names come from manual admin input via /api/simulate.
  if (!simulationMode) {
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

    const { data: dbMatches } = await supabase.from('matches').select('*')

    // ── STEP 1: Assign / correct knockout matchups from the API ───────────────
    // The API is the source of truth for who plays whom. We pair its knockout
    // matches to our DB slots ONE-TO-ONE per phase, by nearest kickoff, so two
    // slots scheduled close together (e.g. the round-of-32 games an hour apart)
    // can't both grab the same teams — the old code matched the *first* slot
    // within a 2h window, which produced wrong/duplicated matchups. We also
    // re-correct slots that were already filled wrong (not just TBD ones), but
    // never touch a match whose result is already loaded (don't rewrite a
    // played/in-progress match's identity out from under existing picks).
    const apiByPhase = new Map<string, { home: string; away: string; date: number }[]>()
    for (const apiMatch of apiMatches) {
      const phase = STAGE_TO_PHASE[apiMatch.stage]
      if (!phase) continue
      if (!apiMatch.homeTeam?.name || !apiMatch.awayTeam?.name) continue
      if (!apiByPhase.has(phase)) apiByPhase.set(phase, [])
      apiByPhase.get(phase)!.push({
        home: normalize(apiMatch.homeTeam.name),
        away: normalize(apiMatch.awayTeam.name),
        date: new Date(apiMatch.utcDate).getTime(),
      })
    }

    for (const [phase, apiList] of apiByPhase) {
      // Candidate slots: EVERY slot of this phase with a date — including ones
      // that already have a result. A finished match (e.g. round-of-32 game
      // already played) must still claim its own slot by nearest kickoff;
      // otherwise the API keeps returning it and it gets re-assigned to a
      // neighbouring free slot, duplicating that matchup and shifting the whole
      // bracket. We just don't WRITE to resulted slots — their teams are locked.
      const slots = (dbMatches ?? []).filter(
        (m) => m.phase === phase && m.match_date
      )
      const usedSlotIds = new Set<string>()
      // Assign earliest API match first to its nearest free slot by kickoff.
      for (const api of [...apiList].sort((a, b) => a.date - b.date)) {
        let best: (typeof slots)[number] | null = null
        let bestDiff = Infinity
        for (const slot of slots) {
          if (usedSlotIds.has(slot.id)) continue
          const diff = Math.abs(new Date(slot.match_date!).getTime() - api.date)
          if (diff < bestDiff) { bestDiff = diff; best = slot }
        }
        if (!best) break // no free slots left for this phase
        usedSlotIds.add(best.id)
        // Only write to slots without a result; a played match keeps its teams.
        if (best.home_score === null && (best.home_team !== api.home || best.away_team !== api.away)) {
          await supabase.from('matches').update({ home_team: api.home, away_team: api.away }).eq('id', best.id)
          best.home_team = api.home
          best.away_team = api.away
          teamsUpdated++
        }
      }
    }

    // ── STEP 2: Update scores for finished matches ─────────────────────────────
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
  }

  const { data: dbMatches } = await supabase.from('matches').select('*')
  const { data: dbPhases } = await supabase.from('active_phases').select('*')

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

    // In simulation mode, activate any phase that's not active yet (and has no
    // TBDs). In real mode, only activate if first kickoff is within 48h.
    if (simulationMode || (hoursUntil <= 48 && hoursUntil > 0)) {
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
        // notifyWinner is NOT auto-fired here — tournamentEndEmail already
        // sends the #1 user a personalized "you finished 1st" email with the
        // prize-claim block. winnerEmail stays available as a manual admin
        // blast for special-occasion use.
        await notifyTournamentEnd(supabase, appUrl)
        tournamentEnded = true
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

// GET — Vercel cron (every 2h per vercel.json, Vercel passes Authorization: Bearer CRON_SECRET).
// Fail-closed: if CRON_SECRET is missing the endpoint is disabled entirely.
// Previously the check was guarded with `if (cronSecret && ...)`, which meant
// an unset secret left the endpoint open to anyone on the internet.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runSync()
  return NextResponse.json(result)
}
