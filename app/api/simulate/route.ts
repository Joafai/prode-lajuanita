import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { PHASE_ORDER, type Phase } from '@/lib/matches-data'

export const runtime = 'nodejs'

type Action = 'fill-phase' | 'clear-phase' | 'reset-all'

interface SimulateBody {
  action: Action
  phase?: Phase
  mode?: 'random' | 'argentina-wins'
}

// Cheap, deterministic-ish RNG seeded by match id so a "fill" run is reproducible
// for a given phase. Math.random() is fine here — there is no correctness need.
function randomScore(): number {
  return Math.floor(Math.random() * 5) // 0..4
}

export async function POST(request: Request) {
  if (process.env.SIMULATION_MODE !== 'true') {
    return NextResponse.json({ error: 'SIMULATION_MODE not enabled' }, { status: 403 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json()) as Partial<SimulateBody>
  const action = body.action
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  const admin = createAdminClient()

  if (action === 'fill-phase') {
    const phase = body.phase
    if (!phase || !PHASE_ORDER.includes(phase)) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })
    }
    const mode = body.mode ?? 'random'

    const { data: matches, error } = await admin
      .from('matches')
      .select('*')
      .eq('phase', phase)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!matches?.length) return NextResponse.json({ updated: 0 })

    let updated = 0
    let skipped = 0
    for (const m of matches) {
      if (m.home_team.startsWith('TBD') || m.away_team.startsWith('TBD')) {
        skipped++
        continue
      }
      let homeScore: number
      let awayScore: number
      if (mode === 'argentina-wins' && (m.home_team === 'Argentina' || m.away_team === 'Argentina')) {
        const argHome = m.home_team === 'Argentina'
        homeScore = argHome ? 2 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 2)
        awayScore = argHome ? Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2)
      } else {
        homeScore = randomScore()
        awayScore = randomScore()
      }
      const { error: upErr } = await admin
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore })
        .eq('id', m.id)
      if (!upErr) updated++
    }
    return NextResponse.json({ updated, skipped, total: matches.length })
  }

  if (action === 'clear-phase') {
    const phase = body.phase
    if (!phase || !PHASE_ORDER.includes(phase)) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })
    }
    const { error, count } = await admin
      .from('matches')
      .update({ home_score: null, away_score: null }, { count: 'exact' })
      .eq('phase', phase)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ cleared: count ?? 0 })
  }

  if (action === 'reset-all') {
    // Wipe every match score, every prize-winner snapshot, and deactivate all
    // phases. This puts the prode back in the same state as freshly seeded so
    // a full E2E test can be re-run from scratch.
    const [
      { error: scoresErr, count: scoresCleared },
      { error: winnersErr },
      { error: phasesErr },
    ] = await Promise.all([
      admin.from('matches').update({ home_score: null, away_score: null }, { count: 'exact' }).not('home_score', 'is', null),
      admin.from('stage_winners').delete().neq('stage_key', ''),
      admin.from('active_phases').update({ is_active: false, activated_at: null }).eq('is_active', true),
    ])
    const errs = [scoresErr, winnersErr, phasesErr].filter(Boolean).map((e) => e!.message)
    if (errs.length) return NextResponse.json({ error: errs.join('; ') }, { status: 500 })
    return NextResponse.json({ scoresCleared: scoresCleared ?? 0, winnersCleared: true, phasesReset: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
